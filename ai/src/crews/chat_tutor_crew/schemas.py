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


class RoutingDecision(BaseModel):
    """Output from the router agent indicating which specialist should handle the request"""
    should_respond: bool = Field(description="Whether the request is language-related and should be handled")
    agent: Optional[Literal["translation", "vocabulary"]] = Field(
        None,
        description="Which specialist agent should handle the request"
    )
    rejection_reason: Optional[str] = Field(
        None,
        description="Reason for declining if should_respond is false"
    )
    user_request: str = Field(description="Summary of the user's original request")
    context_for_agent: str = Field(description="Detailed context for the specialized agent")
