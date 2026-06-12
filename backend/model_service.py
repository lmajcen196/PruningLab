import gc
import os

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

from pruning_runtime import (
    apply_activation_pruning,
    apply_magnitude_pruning,
    build_activation_mask,
    remove_hooks,
)

os.environ["TRANSFORMERS_VERBOSITY"] = "error"
os.environ["TRANSFORMERS_NO_ADVISORY_WARNINGS"] = "1"
os.environ["HF_HUB_DISABLE_PROGRESS_BARS"] = "1"

ALLOWED_MODELS = {
    "mistral-7b-instruct": "mistralai/Mistral-7B-Instruct-v0.2",
    "llama-3-8b-instruct": "meta-llama/Meta-Llama-3-8B-Instruct",
    "gemma-2-9b-instruct": "google/gemma-2-9b-it",
}

_MODEL_CACHE = {}
_JUDGE_CACHE = {}


def get_device() -> str:
    return "cuda" if torch.cuda.is_available() else "cpu"


def get_quantization_config():
    if not torch.cuda.is_available():
        return None

    return BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )


def clear_gpu_memory():
    gc.collect()
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.ipc_collect()


def unload_model(model_name: str | None = None, unload_judge: bool = False):
    global _MODEL_CACHE, _JUDGE_CACHE

    if model_name is None:
        _MODEL_CACHE.clear()
        if unload_judge:
            _JUDGE_CACHE.clear()
    else:
        _MODEL_CACHE.pop(model_name, None)
        if unload_judge:
            _JUDGE_CACHE.pop(model_name, None)

    clear_gpu_memory()
    print(f"[MODEL] Unloaded generation model: {model_name or 'all'}")


def _load_hf_model(hf_model_id: str, role: str):
    device = get_device()
    quantization_config = get_quantization_config()

    print(f"[{role}] Loading tokenizer: {hf_model_id}")
    tokenizer = AutoTokenizer.from_pretrained(
        hf_model_id,
        trust_remote_code=True,
    )

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    if device == "cuda":
        print(f"[{role}] Loading model in 4-bit: {hf_model_id}")

        model = AutoModelForCausalLM.from_pretrained(
            hf_model_id,
            quantization_config=quantization_config,
            device_map="auto",
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
    else:
        print(f"[{role}] Loading model on CPU: {hf_model_id}")

        model = AutoModelForCausalLM.from_pretrained(
            hf_model_id,
            torch_dtype=torch.float32,
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        )
        model.to(device)

    model.eval()

    return {
        "tokenizer": tokenizer,
        "model": model,
        "device": device,
    }


def load_model(model_name: str):
    if model_name not in ALLOWED_MODELS:
        raise ValueError(
            f"Unsupported model '{model_name}'. Allowed models: {list(ALLOWED_MODELS.keys())}"
        )

    if model_name in _MODEL_CACHE:
        return _MODEL_CACHE[model_name]

    hf_model_id = ALLOWED_MODELS[model_name]
    loaded = _load_hf_model(hf_model_id, role="GENERATION")

    _MODEL_CACHE[model_name] = loaded

    print(f"[GENERATION] Model loaded successfully: {model_name}")
    print(f"[GENERATION] object id: {id(loaded['model'])}")

    return loaded


def load_judge_model(model_name: str):
    if model_name not in ALLOWED_MODELS:
        raise ValueError(
            f"Unsupported model '{model_name}'. Allowed models: {list(ALLOWED_MODELS.keys())}"
        )

    if model_name in _JUDGE_CACHE:
        return _JUDGE_CACHE[model_name]

    hf_model_id = ALLOWED_MODELS[model_name]
    loaded = _load_hf_model(hf_model_id, role="JUDGE")

    _JUDGE_CACHE[model_name] = loaded

    print(f"[JUDGE] Base judge model loaded successfully: {model_name}")
    print(f"[JUDGE] object id: {id(loaded['model'])}")

    return loaded


def format_prompt(tokenizer, model_name: str, prompt: str) -> str:
    if "instruct" in model_name or "chat" in model_name:
        messages = [{"role": "user", "content": prompt}]

        try:
            return tokenizer.apply_chat_template(
                messages,
                tokenize=False,
                add_generation_prompt=True,
            )
        except Exception:
            return prompt

    return prompt


def generate_text(
    model_name: str,
    prompt: str,
    max_new_tokens: int = 100,
    temperature: float = 0.3,
    pruning_method: str = "none",
    pruning_percent: float = 0.0,
) -> str:
    loaded = load_model(model_name)

    tokenizer = loaded["tokenizer"]
    model = loaded["model"]
    device = loaded["device"]

    hooks = []

    try:
        if pruning_method == "activation_based" and pruning_percent > 0:
            activation_mask = build_activation_mask(
                model_name=model_name,
                prune_percent=pruning_percent,
            )

            hooks = apply_activation_pruning(
                model=model,
                activation_mask=activation_mask,
                device=device,
            )

            print(
                f"[PRUNING] Applied activation pruning: {pruning_percent}% | "
                f"layers affected: {len(activation_mask)} | hooks: {len(hooks)}"
            )

        elif pruning_method == "magnitude_based" and pruning_percent > 0:
            apply_magnitude_pruning(
                model=model,
                prune_percent=pruning_percent,
            )

            print(f"[PRUNING] Applied magnitude pruning: {pruning_percent}%")

        formatted_prompt = format_prompt(tokenizer, model_name, prompt)

        inputs = tokenizer(
            formatted_prompt,
            return_tensors="pt",
            truncation=True,
            max_length=1024,
        ).to(device)

        do_sample = temperature is not None and temperature > 0

        print(f"[GENERATION] model object id: {id(model)}")

        with torch.no_grad():
            output_ids = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=do_sample,
                temperature=temperature if do_sample else None,
                top_p=0.95 if do_sample else None,
                pad_token_id=tokenizer.eos_token_id,
            )

        new_tokens = output_ids[0][inputs["input_ids"].shape[1]:]
        decoded = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

        return decoded

    finally:
        remove_hooks(hooks)


def get_available_models():
    return list(ALLOWED_MODELS.keys())