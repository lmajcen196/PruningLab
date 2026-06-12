import argparse
import json
import os
import sys
from collections import defaultdict

import torch
from tqdm import tqdm
from transformers import AutoTokenizer, AutoModelForCausalLM


PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.append(BACKEND_DIR)

from model_service import ALLOWED_MODELS


SAFE_CATEGORIES = {
    "benign",
    "borderline",
    "harmful_direct",
}

JAILBREAK_CATEGORIES = {
    "jailbreak_attack",
}


def read_jsonl(path):
    rows = []

    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()

            if not line:
                continue

            rows.append(json.loads(line))

    return rows


def get_prompt(row):
    if "user_question" in row and row["user_question"]:
        return row["user_question"]

    if "prompt" in row and row["prompt"]:
        return row["prompt"]

    if "text" in row and row["text"]:
        return row["text"]

    raise ValueError(f"Cannot find prompt in row: {row}")


def get_category(row):
    if "category" in row:
        return str(row["category"]).strip().lower()

    if "label" in row:
        return str(row["label"]).strip().lower()

    raise ValueError(f"Cannot find category/label in row: {row}")


def format_prompt(tokenizer, model_name, prompt):
    if "instruct" in model_name or "chat" in model_name:
        messages = [
            {"role": "user", "content": prompt}
        ]

        try:
            return tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
        except Exception:
            return prompt

    return prompt


class ActivationCollector:
    def __init__(self, model):
        self.model = model
        self.hooks = []
        self.layer_sums = defaultdict(lambda: None)
        self.layer_counts = defaultdict(int)

    def _make_hook(self, layer_idx):
        def hook_fn(module, inputs, output):
            if isinstance(output, tuple):
                hidden_states = output[0]
            else:
                hidden_states = output

            act = hidden_states.detach().abs().mean(dim=(0, 1)).float().cpu()

            if self.layer_sums[layer_idx] is None:
                self.layer_sums[layer_idx] = act
            else:
                self.layer_sums[layer_idx] += act

            self.layer_counts[layer_idx] += 1

        return hook_fn

    def register(self):
        for idx, layer in enumerate(self.model.model.layers):
            hook = layer.register_forward_hook(self._make_hook(idx))
            self.hooks.append(hook)

    def remove(self):
        for hook in self.hooks:
            hook.remove()

        self.hooks = []

    def means(self):
        result = {}

        for layer_idx, total in self.layer_sums.items():
            count = self.layer_counts[layer_idx]
            result[layer_idx] = total / max(count, 1)

        return result


def collect_activations(model, tokenizer, model_name, prompts, device, max_length):
    collector = ActivationCollector(model)
    collector.register()

    try:
        for prompt in tqdm(prompts, desc="Collecting activations"):
            formatted_prompt = format_prompt(tokenizer, model_name, prompt)

            inputs = tokenizer(
                formatted_prompt,
                return_tensors="pt",
                truncation=True,
                max_length=max_length,
            ).to(device)

            with torch.no_grad():
                model(**inputs)

    finally:
        collector.remove()

    return collector.means()


def build_scores(safe_means, jailbreak_means):
    scores = []

    for layer_idx in jailbreak_means:
        if layer_idx not in safe_means:
            continue

        score_tensor = jailbreak_means[layer_idx] - safe_means[layer_idx]

        for neuron_idx, score in enumerate(score_tensor.tolist()):
            if score > 0:
                scores.append({
                    "layer": int(layer_idx),
                    "neuron": int(neuron_idx),
                    "score": float(score),
                })

    scores = sorted(scores, key=lambda x: x["score"], reverse=True)
    return scores


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument("--model", required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--output-dir", default=os.path.join(PROJECT_ROOT, "pruning", "data"))
    parser.add_argument("--max-length", type=int, default=512)

    args = parser.parse_args()

    if args.model not in ALLOWED_MODELS:
        raise ValueError(f"Unsupported model: {args.model}. Allowed: {list(ALLOWED_MODELS.keys())}")

    rows = read_jsonl(args.dataset)

    safe_prompts = []
    jailbreak_prompts = []

    for row in rows:
        category = get_category(row)
        prompt = get_prompt(row)

        if category in SAFE_CATEGORIES:
            safe_prompts.append(prompt)

        elif category in JAILBREAK_CATEGORIES:
            jailbreak_prompts.append(prompt)

    if not safe_prompts:
        raise ValueError("No safe prompts found. Expected categories: benign, borderline, harmful_direct")

    if not jailbreak_prompts:
        raise ValueError("No jailbreak prompts found. Expected category: jailbreak")

    hf_model_id = ALLOWED_MODELS[args.model]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32

    print(f"Loading tokenizer: {hf_model_id}")
    tokenizer = AutoTokenizer.from_pretrained(
        hf_model_id,
        trust_remote_code=True,
    )

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print(f"Loading model: {hf_model_id} on {device}")
    model = AutoModelForCausalLM.from_pretrained(
        hf_model_id,
        torch_dtype=dtype,
        trust_remote_code=True,
    )

    model.to(device)
    model.eval()

    print(f"Safe prompts: {len(safe_prompts)}")
    print(f"Jailbreak prompts: {len(jailbreak_prompts)}")

    safe_means = collect_activations(
        model=model,
        tokenizer=tokenizer,
        model_name=args.model,
        prompts=safe_prompts,
        device=device,
        max_length=args.max_length,
    )

    jailbreak_means = collect_activations(
        model=model,
        tokenizer=tokenizer,
        model_name=args.model,
        prompts=jailbreak_prompts,
        device=device,
        max_length=args.max_length,
    )

    scores = build_scores(
        safe_means=safe_means,
        jailbreak_means=jailbreak_means,
    )

    os.makedirs(args.output_dir, exist_ok=True)

    output_path = os.path.join(
        args.output_dir,
        f"activation_scores_{args.model}.json"
    )

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(scores, f, indent=2)

    print(f"Saved activation scores to: {output_path}")
    print(f"Total positive attack neurons: {len(scores)}")


if __name__ == "__main__":
    main()