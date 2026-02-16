from pydantic import BaseModel, Field
from typing import Optional, Literal, List, Dict, Any


class ToolCall(BaseModel):
    """Represents a tool call from the AI agent"""
    name: str = Field(description="Name of the tool to call (e.g., 'save_word_pair')")
    arguments: Dict[str, Any] = Field(description="Arguments to pass to the tool")


class TutorResponse(BaseModel):
    """Structured response from the chat tutor"""
    response_type: Literal["text", "word_suggestion", "save_confirmation", "error"] = Field(
        description="Type of response - determines UI rendering"
    )
    content: str = Field(description="The main text content of the response")
    data: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional data for special response types (word, translation, example for word_suggestion)"
    )
    tool_calls: Optional[List[ToolCall]] = Field(
        None,
        description="List of tool calls the agent wants to make"
    )
