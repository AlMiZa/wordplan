from pydantic import BaseModel, Field
from typing import List


class PhraseOutput(BaseModel):
    """Schema for the phrase generation output."""

    phrase: str = Field(
        ...,
        description="The generated phrase using the provided words"
    )
    words_used: List[str] = Field(
        ...,
        description="List of words that were actually used in the generated phrase"
    )
