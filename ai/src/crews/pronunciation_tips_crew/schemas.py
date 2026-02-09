from pydantic import BaseModel, Field
from typing import List

class PronunciationTipsOutput(BaseModel):
    """Schema for pronunciation tips output."""
    word: str = Field(..., description="The word being analyzed")
    phonetic_transcription: str = Field(..., description="IPA phonetic transcription")
    syllables: List[str] = Field(..., description="Word broken into syllables")
    pronunciation_tips: List[str] = Field(..., description="Tips for correct pronunciation")
    memory_aids: List[str] = Field(..., description="Memory aids to remember the word")
    common_mistakes: List[str] = Field(default=[], description="Common pronunciation mistakes to avoid")
