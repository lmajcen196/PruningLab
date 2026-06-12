from fastapi.responses import StreamingResponse
from defenses.defense_manager import apply_defense


async def run_no_attack(
    model_id: str,
    template: str,
    defense: str = "none",
    session_id: str | None = None,
):
    blocked, resp = await apply_defense(
        defense=defense,
        template=template,
        model_id=model_id,
        session_id=session_id,
        skip_progress=True,
    )

    if resp and isinstance(resp, StreamingResponse):
        async for chunk in resp.body_iterator:
            yield chunk
    elif resp:
        yield str(resp).encode("utf-8")