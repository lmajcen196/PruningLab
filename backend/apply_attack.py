from attacks.attack_manager import ATTACKS


def apply_attack(prompt: str, attack: str | None) -> str:
    """
    This function is kept only for compatibility.

    Your current attacks are implemented as async functions that already call
    the model and stream the response, so they cannot be used here as simple
    prompt transformers.

    For now, return the original prompt. Attack execution should go through
    attack_manager.run_attack().
    """
    if not attack or attack == "none":
        return prompt

    if attack not in ATTACKS:
        print(f"Unknown attack: {attack}")
        return prompt

    return prompt