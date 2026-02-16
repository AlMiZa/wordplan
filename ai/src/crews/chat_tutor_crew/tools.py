"""
CrewAI tools for the Chat Tutor Crew.

This module defines tools that agents can use to take actions with side effects,
such as saving word pairs to the user's flashcard deck.

Note: When CrewAI agents call these tools, user_id may not be automatically injected.
The tool handling layer (in run.py) is responsible for injecting user_id into tool calls.
"""

import logging
from typing import Optional
from crewai.tools import tool
from supabase import create_client
import os

logger = logging.getLogger(__name__)

# Initialize Supabase client for tool operations
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
supabase_admin = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@tool("save_word_pair")
def save_word_pair_tool(
    source_word: str,
    translated_word: str,
    context_sentence: Optional[str] = None
) -> str:
    """
    Save a word and its translation to the user's personal flashcard deck for future practice.

    This tool should be used when:
    - A user asks to save a word they just learned
    - After providing a translation, if the user wants to remember it
    - When suggesting new vocabulary that the user might want to practice

    Args:
        source_word: The word in the user's native language (e.g., "thank you")
        translated_word: The translation in the target language (e.g., "dziękuję")
        context_sentence: An example sentence using the word (optional)

    Returns:
        A confirmation message with details about the saved word pair.

    Example:
        save_word_pair_tool(
            source_word="thank you",
            translated_word="dziękuję",
            context_sentence="Dziękuję bardzo za pomoc!"
        )
        Returns: "Done! I've added 'thank you → dziękuję' to your flashcard deck."

    Note: user_id is injected automatically by the system and should not be provided by the agent.
    """
    # Validate required parameters
    if not source_word or not translated_word:
        return "Error: Both source_word and translated_word are required to save a word pair."

    # Return a structured response indicating that the tool should be called
    # The actual database operation will be handled by the tool handler in run.py
    # This allows the system to inject user_id and handle the operation securely
    return f"Tool call received for save_word_pair: {source_word} -> {translated_word}"


# Export all tools for CrewAI integration
__all__ = ["save_word_pair_tool"]
