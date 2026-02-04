from pydantic import BaseModel, Field
from typing import List, Optional


class PhraseOutput(BaseModel):
    """Schema for the phrase generation output."""

    phrase: str = Field(
        ...,
        description="The generated phrase in English"
    )
    phrase_target_lang: Optional[str] = Field(
        None,
        description="Translation in target language"
    )
    target_language: Optional[str] = Field(
        None,
        description="Target language code (polish, belarusian, italian)"
    )
    words_used: List[str] = Field(
        ...,
        description="List of words that were actually used in the generated phrase"
    )
