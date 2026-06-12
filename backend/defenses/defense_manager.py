from fastapi.responses import StreamingResponse

from model_service import generate_text


def parse_pruning_config(defense: str | None):
    if not defense or defense == "none":
        return "none", 0.0

    if defense.startswith("activation_based:"):
        value = defense.split(":", 1)[1]
        try:
            percent = float(value)
        except ValueError:
            percent = 0.0
        return "activation_based", percent

    if defense.startswith("magnitude_based:"):
        value = defense.split(":", 1)[1]
        try:
            percent = float(value)
        except ValueError:
            percent = 0.0
        return "magnitude_based", percent

    return "none", 0.0


async def apply_defense(
    defense: str,
    template: str,
    model_id: str,
    device: str | None = None,
    session_id: str | None = None,
    skip_progress: bool = False,
):
    pruning_method, pruning_percent = parse_pruning_config(defense)

    result = generate_text(
        model_name=model_id,
        prompt=template,
        pruning_method=pruning_method,
        pruning_percent=pruning_percent,
    )

    def stream():
        yield result.encode("utf-8")

    return False, StreamingResponse(stream(), media_type="text/plain")