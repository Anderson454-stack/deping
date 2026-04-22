from __future__ import annotations

from typing import Annotated, Any

from pydantic import BaseModel, Field, StringConstraints


class AdvancedSearchRequest(BaseModel):
    query: str = ""
    top: int = 10
    genre: str | None = None
    year_from: int | None = None
    year_to: int | None = None


class RecommendRequest(BaseModel):
    profile: dict[str, Any] = Field(default_factory=dict)


class ChatRequest(BaseModel):
    message: Annotated[str, StringConstraints(max_length=2000)]
    conversation_history: list[Any] = Field(default_factory=list)
    current_profile: dict[str, Any] = Field(default_factory=dict)
    turn: int = 0
