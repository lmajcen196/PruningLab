from pydantic import BaseModel, Field
from typing import Optional


class GenerateRequest(BaseModel):
    model: str = Field(..., description="Model name")
    prompt: str = Field(..., description="User input prompt")
    num_experiments: int = Field(default=1, ge=1, le=100)
    pruning_method: Optional[str] = Field(default="none")
    pruning_percent: Optional[float] = Field(default=0.0, ge=0.0, le=100.0)

    attack: Optional[str] = Field(default=None)

    max_new_tokens: Optional[int] = Field(default=100, ge=1, le=512)
    temperature: Optional[float] = Field(default=0.7, ge=0.1, le=2.0)


class GenerateResponse(BaseModel):
    model: str
    prompt: str
    num_experiments: int
    response: str

    pruning_method: Optional[str] = None
    pruning_percent: Optional[float] = None
    attack: Optional[str] = None
