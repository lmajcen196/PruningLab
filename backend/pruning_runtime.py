import json
import os
from collections import defaultdict

import torch


PRUNING_DATA_DIR = os.getenv(
    "PRUNING_DATA_DIR",
    os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "pruning",
        "data",
        "processed",
    ),
)


def get_activation_scores_path(model_name: str) -> str:
    return os.path.join(PRUNING_DATA_DIR, f"activation_scores_{model_name}.json")


def load_activation_scores(model_name: str):
    path = get_activation_scores_path(model_name)

    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Activation scores file not found: {path}. "
            f"Expected file name: activation_scores_{model_name}.json"
        )

    with open(path, "r", encoding="utf-8") as f:
        scores = json.load(f)

    return sorted(scores, key=lambda x: float(x["score"]), reverse=True)


def build_activation_mask(model_name: str, prune_percent: float):
    if prune_percent <= 0:
        return {}

    scores = load_activation_scores(model_name)
    total_attack_neurons = len(scores)

    num_to_prune = int(round(total_attack_neurons * prune_percent / 100.0))
    num_to_prune = max(0, min(num_to_prune, total_attack_neurons))

    selected = scores[:num_to_prune]
    mask = defaultdict(list)

    for item in selected:
        layer = int(item["layer"])
        neuron = int(item["neuron"])
        mask[layer].append(neuron)

    total_pruned = sum(len(v) for v in mask.values())
    print(
        f"[ACTIVATION PRUNING] percent={prune_percent}% | "
        f"attack_neurons={total_attack_neurons} | selected={total_pruned}"
    )

    return dict(mask)


def remove_hooks(hooks):
    for hook in hooks:
        try:
            hook.remove()
        except Exception:
            pass


def apply_activation_pruning(model, activation_mask, device):
    hooks = []

    if not activation_mask:
        return hooks

    layers = model.model.layers

    for layer_idx, neuron_list in activation_mask.items():
        layer_idx = int(layer_idx)

        if layer_idx < 0 or layer_idx >= len(layers):
            continue

        neurons = torch.tensor(neuron_list, dtype=torch.long, device=device)

        def make_hook(neuron_ids):
            def hook_fn(module, inputs, output):
                if isinstance(output, tuple):
                    hidden_states = output[0].clone()
                    hidden_states[..., neuron_ids] = 0
                    return (hidden_states,) + output[1:]

                hidden_states = output.clone()
                hidden_states[..., neuron_ids] = 0
                return hidden_states

            return hook_fn

        hook = layers[layer_idx].register_forward_hook(make_hook(neurons))
        hooks.append(hook)

    return hooks


def should_prune_parameter(name: str, param: torch.nn.Parameter) -> bool:
    if not param.requires_grad:
        return False

    if param.dim() < 2:
        return False

    lowered = name.lower()

    excluded_keywords = [
        "embed",
        "embedding",
        "lm_head",
        "norm",
        "layernorm",
        "layer_norm",
        "ln_",
    ]

    return not any(keyword in lowered for keyword in excluded_keywords)


def apply_magnitude_pruning(model, prune_percent: float):
    """
    Layer-wise magnitude pruning.

    For every selected weight matrix separately, prune prune_percent% of weights
    with the smallest absolute values. Embeddings, lm_head and normalization
    parameters are skipped.
    """
    if prune_percent <= 0:
        return

    prune_percent = max(0.0, min(float(prune_percent), 100.0))

    total_weights = 0
    total_pruned = 0
    pruned_tensors = 0

    with torch.no_grad():
        for name, param in model.named_parameters():
            if not should_prune_parameter(name, param):
                continue

            weight_abs = param.detach().abs().float().flatten()
            num_weights = weight_abs.numel()
            k = int(num_weights * prune_percent / 100.0)

            total_weights += num_weights

            if k <= 0:
                continue

            k = min(k, num_weights - 1)
            threshold = torch.kthvalue(weight_abs, k).values.to(
                dtype=param.dtype,
                device=param.device,
            )

            mask = param.abs() <= threshold
            pruned_here = int(mask.sum().item())

            param[mask] = 0

            total_pruned += pruned_here
            pruned_tensors += 1

    print(
        f"[MAGNITUDE PRUNING - LAYER WISE] percent={prune_percent}% | "
        f"tensors={pruned_tensors} | pruned_weights={total_pruned}/{total_weights}"
    )
