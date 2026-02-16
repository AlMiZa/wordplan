import asyncio
import logging
import os
import warnings
from functools import wraps
from typing import Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client
from crewai import Crew, Process

from src.crews.random_phrase_crew.crew import RandomPhraseCrew
from src.crews.random_phrase_crew.schemas import PhraseOutput
from src.crews.pronunciation_tips_crew.crew import PronunciationTipsCrew
from src.crews.pronunciation_tips_crew.schemas import PronunciationTipsOutput
from src.crews.chat_tutor_crew.crew import ChatTutorCrew
from src.crews.chat_tutor_crew.schemas import TutorResponse, RoutingDecision

from src.lib.tracer import traceable

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

# Initialize Flask app
app = Flask(__name__)

# Configure CORS - allow requests from localhost frontend
CORS(app, resources={
    r"/api/*": {
        "origins": "*",  # Allow all origins for development
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": False  # Cannot use credentials with wildcard origin
    }
})

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL", "http://127.0.0.1:54321")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
# Create a service role client for admin operations (bypasses RLS)
supabase_admin: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def require_auth(f):
    """
    Decorator to require authentication for endpoints.
    Validates the JWT token from the Authorization header.
    """
    @wraps(f)
    async def decorated_function(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Authorization header is required"}), 401

        # Extract token from "Bearer <token>" format
        try:
            token = auth_header.split(" ")[1] if " " in auth_header else auth_header
        except IndexError:
            return jsonify({"error": "Invalid authorization header format"}), 401

        try:
            # Verify the JWT token with Supabase
            user_response = supabase.auth.get_user(token)
            request.user = user_response.user
        except Exception as e:
            return jsonify({"error": f"Authentication failed: {str(e)}"}), 401

        return await f(*args, **kwargs)

    return decorated_function


async def get_user_context(user_id: str) -> tuple[Optional[str], Optional[str]]:
    """
    Fetch user context and target language from Supabase.
    Uses service role client to bypass RLS and ensure access.

    Args:
        user_id: The user's UUID

    Returns:
        Tuple of (user_context, target_language) or (None, None) if not found
    """
    try:
        # Use service role client to bypass RLS and fetch profile
        # This ensures we can always read the user's profile
        response = supabase_admin.table("profiles").select("context", "target_language").eq("id", user_id).execute()

        if response.data and len(response.data) > 0:
            logger.debug(f"Found profile for user {user_id}")
            return response.data[0].get("context", ""), response.data[0].get("target_language")
        else:
            # Profile doesn't exist, create it with service role
            logger.warning(f"Profile not found for user {user_id}, creating it...")
            response = supabase_admin.table("profiles").insert({
                "id": user_id,
                "context": None,
                "target_language": None
            }).execute()
            logger.info(f"Created profile for user {user_id}")
            return "", None
    except Exception as e:
        logger.error(f"Error fetching user context: {e}", exc_info=True)
        return None, None


@traceable
async def generate_random_phrase(words: list[str], user_context: str, target_language: Optional[str] = None) -> PhraseOutput:
    """
    Generate a random phrase using the RandomPhraseCrew.

    Args:
        words: List of words to use in the phrase
        user_context: User context to personalize the phrase
        target_language: Target language for bilingual output (polish, belarusian, italian)

    Returns:
        PhraseOutput with phrase, translation, and words used
    """
    inputs = {
        'words': jsonify(words).get_data(as_text=True),
        'user_context': jsonify(user_context).get_data(as_text=True),
        'target_language': jsonify(target_language).get_data(as_text=True)
    }

    result = await RandomPhraseCrew().crew().kickoff_async(inputs=inputs)

    # CrewAI returns a result with a .pydantic attribute containing the Pydantic model
    if hasattr(result, 'pydantic'):
        return result.pydantic

    # Fallback - return a basic PhraseOutput
    return PhraseOutput(phrase=str(result), words_used=words)


async def get_cached_pronunciation_tips(user_id: str, word: str) -> Optional[dict]:
    """
    Fetch cached pronunciation tips from Supabase.

    Args:
        user_id: The user's UUID
        word: The word to fetch cached tips for

    Returns:
        Cached pronunciation tips dict or None if not found
    """
    try:
        response = supabase_admin.table("pronunciation_tips_cache").select("*").eq("user_id", user_id).eq("word", word).execute()
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    except Exception as e:
        logger.error(f"Error fetching cached pronunciation tips: {e}")
        return None


async def save_pronunciation_tips_cache(user_id: str, tips: PronunciationTipsOutput) -> None:
    """
    Save pronunciation tips to cache.

    Args:
        user_id: The user's UUID
        tips: The pronunciation tips to cache
    """
    try:
        cache_data = {
            "user_id": user_id,
            "word": tips.word,
            "phonetic_transcription": tips.phonetic_transcription,
            "syllables": tips.syllables,
            "pronunciation_tips": tips.pronunciation_tips,
            "memory_aids": tips.memory_aids,
            "common_mistakes": tips.common_mistakes
        }
        supabase_admin.table("pronunciation_tips_cache").upsert(cache_data, on_conflict="user_id,word").execute()
        logger.info(f"Cached pronunciation tips for word: {tips.word}")
    except Exception as e:
        logger.error(f"Error saving pronunciation tips cache: {e}")


@traceable
async def generate_pronunciation_tips(word: str) -> PronunciationTipsOutput:
    """
    Generate pronunciation tips for a single word using the PronunciationTipsCrew.

    Args:
        word: The word to analyze

    Returns:
        PronunciationTipsOutput with pronunciation guidance
    """
    inputs = {'word': word}
    result = await PronunciationTipsCrew().crew().kickoff_async(inputs=inputs)

    if hasattr(result, 'pydantic'):
        return result.pydantic

    return PronunciationTipsOutput(
        word=word,
        phonetic_transcription="/ˈwɜːrd/",
        syllables=[word],
        pronunciation_tips=["Focus on clear pronunciation"],
        memory_aids=["Remember the spelling"],
        common_mistakes=[]
    )


@app.route("/health", methods=["GET"])
async def health():
    """Health check endpoint."""
    return jsonify({"status": "healthy"}), 200


@app.route("/api/random-phrase", methods=["POST"])
@require_auth
async def get_random_phrase():
    """
    Generate a random phrase based on provided words and user context.

    Request body:
        {
            "words": ["word1", "word2", ...]
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "phrase": "generated phrase",
            "phrase_target_lang": "translation or null",
            "target_language": "language code or null",
            "words_used": ["word1", "word2"]
        }
    """
    try:
        # Get words from request body
        data = request.get_json()

        if not data or "words" not in data:
            return jsonify({"error": "Request body must include 'words' array"}), 400

        words = data.get("words", [])

        if not isinstance(words, list) or len(words) == 0:
            return jsonify({"error": "'words' must be a non-empty array"}), 400

        # Get user context from Supabase
        user_id = request.user.id
        user_context, target_language = await get_user_context(user_id)

        # Generate the phrase
        result = await generate_random_phrase(words, user_context or "", target_language)

        return jsonify(result.model_dump()), 200

    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/profile/target-language", methods=["PUT"])
@require_auth
async def update_target_language():
    """
    Update the user's target language preference.
    Creates a profile if it doesn't exist.

    Request body:
        {
            "target_language": "polish" | "belarusian" | "italian"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "success": true,
            "target_language": "polish"
        }
    """
    try:
        data = request.get_json()

        if not data or "target_language" not in data:
            return jsonify({"error": "Request body must include 'target_language' field"}), 400

        target_language = data.get("target_language")

        valid_languages = ["polish", "belarusian", "italian"]
        if target_language not in valid_languages:
            return jsonify({"error": f"target_language must be one of: {valid_languages}"}), 400

        user_id = request.user.id
        logger.info(f"Updating target language for user {user_id} to {target_language}")

        # First, try to update the profile
        response = supabase.table("profiles").update({"target_language": target_language}).eq("id", user_id).execute()
        logger.info(f"Update response: {response.data}")

        # If no rows were updated, the profile doesn't exist - create it
        if response.data == [] or len(response.data) == 0:
            logger.warning(f"Profile not found for user {user_id}, creating it...")
            try:
                # Use service role client to bypass RLS for profile creation
                response = supabase_admin.table("profiles").insert({
                    "id": user_id,
                    "context": None,
                    "target_language": target_language
                }).execute()
                logger.info(f"Profile created: {response.data}")
            except Exception as insert_error:
                # Profile might have been created by the trigger between our check and insert
                if "duplicate key" in str(insert_error).lower():
                    logger.info(f"Profile already exists (likely created by trigger), updating instead...")
                    response = supabase_admin.table("profiles").update({
                        "target_language": target_language
                    }).eq("id", user_id).execute()
                    logger.info(f"Profile updated: {response.data}")
                else:
                    raise insert_error

        return jsonify({"success": True, "target_language": target_language}), 200

    except Exception as e:
        logger.error(f"Error updating target language: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/pronunciation-tips", methods=["POST"])
@require_auth
async def get_pronunciation_tips():
    """
    Generate pronunciation tips for a word.

    Request body:
        {"word": "example"}

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "word": "example",
            "phonetic_transcription": "/ɪɡˈzæmpəl/",
            "syllables": ["ex", "am", "ple"],
            "pronunciation_tips": ["...", "..."],
            "memory_aids": ["...", "..."],
            "common_mistakes": ["..."],
            "cached": true/false
        }
    """
    try:
        data = request.get_json()

        if not data or "word" not in data:
            return jsonify({"error": "Request body must include 'word' field"}), 400

        word = data.get("word", "").strip()

        if not word:
            return jsonify({"error": "'word' cannot be empty"}), 400

        user_id = request.user.id

        # Check cache first
        cached = await get_cached_pronunciation_tips(user_id, word)
        if cached:
            logger.info(f"Cache hit for word: {word}")
            return jsonify({
                "word": cached["word"],
                "phonetic_transcription": cached["phonetic_transcription"],
                "syllables": cached["syllables"],
                "pronunciation_tips": cached["pronunciation_tips"],
                "memory_aids": cached["memory_aids"],
                "common_mistakes": cached["common_mistakes"],
                "cached": True
            }), 200

        # Cache miss - generate new tips
        logger.info(f"Cache miss for word: {word}, generating...")
        result = await generate_pronunciation_tips(word)

        # Save to cache
        await save_pronunciation_tips_cache(user_id, result)

        return jsonify({**result.model_dump(), "cached": False}), 200

    except Exception as e:
        logger.error(f"Error generating pronunciation tips: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


async def handle_tool_call(tool_name: str, arguments: dict, user_id: str) -> str:
    """
    Handle tool invocations from the AI agent.

    Args:
        tool_name: Name of the tool to call
        arguments: Arguments to pass to the tool
        user_id: The user's UUID

    Returns:
        Result message from the tool execution
    """
    if tool_name == "save_word_pair":
        # Inject user_id into arguments if not already present
        # This handles both manual tool calls and CrewAI agent tool calls
        arguments_with_user = {**arguments, "user_id": user_id}

        source_word = arguments_with_user.get("source_word")
        translated_word = arguments_with_user.get("translated_word")
        context_sentence = arguments_with_user.get("context_sentence")

        if not source_word or not translated_word:
            return "Error: Both source_word and translated_word are required to save a word pair."

        # Check for duplicates
        existing = supabase_admin.table("word_pairs").select("*") \
            .eq("user_id", user_id) \
            .eq("source_word", source_word) \
            .eq("translated_word", translated_word) \
            .execute()

        if existing.data:
            return f"'{source_word}' is already in your flashcard deck!"

        # Insert new word pair
        word_pair_data = {
            "user_id": user_id,
            "source_word": source_word,
            "translated_word": translated_word,
        }

        if context_sentence:
            word_pair_data["context_sentence"] = context_sentence

        supabase_admin.table("word_pairs").insert(word_pair_data).execute()

        # Return user-friendly confirmation
        if context_sentence:
            return f"Done! I've added '{source_word} → {translated_word}' to your flashcard deck. Example: {context_sentence}"
        else:
            return f"Done! I've added '{source_word} → {translated_word}' to your flashcard deck."

    return f"Unknown tool: {tool_name}"


@app.route("/api/chat/message", methods=["POST"])
@require_auth
async def send_chat_message():
    """
    Send a message to the chat tutor and get an AI response.

    Request body:
        {
            "chat_id": "uuid",
            "message": "user message"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "id": "message_id",
            "chat_id": "chat_id",
            "role": "assistant",
            "content": {...},
            "created_at": "timestamp"
        }
    """
    try:
        data = request.get_json()

        if not data or "message" not in data:
            return jsonify({"error": "Request body must include 'message' field"}), 400

        message = data.get("message", "").strip()
        chat_id = data.get("chat_id")

        if not message:
            return jsonify({"error": "'message' cannot be empty"}), 400

        user_id = request.user.id

        # Fetch conversation history if chat_id is provided
        conversation_history = []
        if chat_id:
            messages_response = supabase_admin.table("chat_messages").select("*") \
                .eq("chat_id", chat_id) \
                .limit(20) \
                .execute()

            # Reverse to get chronological order
            conversation_history = list(reversed(messages_response.data))

        # Fetch user context
        user_context, target_language = await get_user_context(user_id)

        # Format conversation history for the AI
        history_text = ""
        for msg in conversation_history[-10:]:  # Last 10 messages for context
            role = msg.get("role", "user")
            content = msg.get("content", {})
            if isinstance(content, dict):
                content_str = content.get("content", str(content))
            else:
                content_str = str(content)
            history_text += f"{role.capitalize()}: {content_str}\n"

        # Run the ChatTutorCrew with user_id for tool context
        inputs = {
            'user_message': message,
            'target_language': target_language if target_language else "None",
            'user_context': user_context if user_context else "",
            'conversation_history': history_text if history_text else "No previous messages",
            'user_id': user_id  # Pass user_id so tools can access it
        }

        # Step 1: Run the router task to determine which specialist should handle the request
        crew_instance = ChatTutorCrew()
        routing_result = await crew_instance.crew().kickoff_async(inputs=inputs)

        if not hasattr(routing_result, 'pydantic'):
            raise Exception("Router task did not return a pydantic model")

        routing_decision: RoutingDecision = routing_result.pydantic
        logger.info(f"Router decision: should_respond={routing_decision.should_respond}, agent={routing_decision.agent}")

        # Step 2: Based on routing decision, execute the appropriate specialist task
        tutor_response: TutorResponse

        if not routing_decision.should_respond:
            # Router declined the request
            tutor_response = TutorResponse(
                response_type="error",
                content=routing_decision.rejection_reason or "I can only help with language-related questions.",
                data=None,
                tool_calls=None
            )
        elif routing_decision.agent == "translation":
            # Run translation task - this will show as a separate trace in Phoenix
            translation_inputs = {
                **inputs,
                'user_request': routing_decision.user_request,
            }
            # Use a separate crew instance with just the translation task
            translation_crew = Crew(
                agents=[crew_instance.translation_agent()],
                tasks=[crew_instance.translation_task()],
                process=Process.sequential
            )
            translation_result = await translation_crew.kickoff_async(inputs=translation_inputs)

            if hasattr(translation_result, 'pydantic'):
                tutor_response = translation_result.pydantic
            else:
                tutor_response = TutorResponse(
                    response_type="text",
                    content=str(translation_result),
                    data=None,
                    tool_calls=None
                )
        elif routing_decision.agent == "vocabulary":
            # Run vocabulary task - this will show as a separate trace in Phoenix
            vocabulary_inputs = {
                **inputs,
                'user_request': routing_decision.user_request,
            }
            # Use a separate crew instance with just the vocabulary task
            vocabulary_crew = Crew(
                agents=[crew_instance.vocabulary_agent()],
                tasks=[crew_instance.vocabulary_task()],
                process=Process.sequential
            )
            vocabulary_result = await vocabulary_crew.kickoff_async(inputs=vocabulary_inputs)

            if hasattr(vocabulary_result, 'pydantic'):
                tutor_response = vocabulary_result.pydantic
            else:
                tutor_response = TutorResponse(
                    response_type="text",
                    content=str(vocabulary_result),
                    data=None,
                    tool_calls=None
                )
        else:
            # Fallback - router didn't specify an agent
            tutor_response = TutorResponse(
                response_type="error",
                content="I couldn't determine how to help with that request.",
                data=None,
                tool_calls=None
            )

        # Handle tool calls if present
        if tutor_response.tool_calls:
            for tool_call in tutor_response.tool_calls:
                tool_result = await handle_tool_call(
                    tool_call.name,
                    tool_call.arguments,
                    user_id
                )
                logger.info(f"Tool {tool_call.name} result: {tool_result}")

        # Save user message to database
        if not chat_id:
            # Create new chat if needed
            chat_response = supabase_admin.table("chats").insert({
                "user_id": user_id,
                "title": message[:50] + "..." if len(message) > 50 else message
            }).execute()
            chat_id = chat_response.data[0]["id"]

        # Save user message
        supabase_admin.table("chat_messages").insert({
            "chat_id": chat_id,
            "role": "user",
            "content": {"content": message}
        }).execute()

        # Save assistant response
        response_data = supabase_admin.table("chat_messages").insert({
            "chat_id": chat_id,
            "role": "assistant",
            "content": tutor_response.model_dump()
        }).execute()

        # Update chat's updated_at timestamp
        supabase_admin.table("chats").update({
            "updated_at": "now()"
        }).eq("id", chat_id).execute()

        # Return the assistant message
        assistant_message = response_data.data[0]
        return jsonify(assistant_message), 200

    except Exception as e:
        logger.error(f"Error sending chat message: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/chats", methods=["GET"])
@require_auth
async def get_chats():
    """
    Get all chats for the current user.

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        [
            {
                "id": "uuid",
                "user_id": "uuid",
                "title": "chat title",
                "created_at": "timestamp",
                "updated_at": "timestamp"
            }
        ]
    """
    try:
        user_id = request.user.id

        response = supabase_admin.table("chats").select("*") \
            .eq("user_id", user_id) \
            .execute()

        return jsonify(response.data), 200

    except Exception as e:
        logger.error(f"Error fetching chats: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/chats", methods=["POST"])
@require_auth
async def create_chat():
    """
    Create a new chat.

    Request body:
        {
            "title": "optional title"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "id": "uuid",
            "user_id": "uuid",
            "title": "title or null",
            "created_at": "timestamp",
            "updated_at": "timestamp"
        }
    """
    try:
        data = request.get_json() or {}
        title = data.get("title")
        user_id = request.user.id

        response = supabase_admin.table("chats").insert({
            "user_id": user_id,
            "title": title
        }).execute()

        return jsonify(response.data[0]), 201

    except Exception as e:
        logger.error(f"Error creating chat: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/chats/<chat_id>", methods=["DELETE"])
@require_auth
async def delete_chat(chat_id: str):
    """
    Delete a chat and all its messages.

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {"success": true}
    """
    try:
        user_id = request.user.id

        # Verify the chat belongs to the user
        chat_response = supabase_admin.table("chats").select("*") \
            .eq("id", chat_id) \
            .eq("user_id", user_id) \
            .execute()

        if not chat_response.data:
            return jsonify({"error": "Chat not found"}), 404

        # Delete the chat (messages will be cascaded)
        supabase_admin.table("chats").delete().eq("id", chat_id).execute()

        return jsonify({"success": True}), 200

    except Exception as e:
        logger.error(f"Error deleting chat: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/chats/<chat_id>", methods=["PUT"])
@require_auth
async def update_chat(chat_id: str):
    """
    Update a chat's title.

    Request body:
        {
            "title": "new chat title"
        }

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {
            "id": "uuid",
            "user_id": "uuid",
            "title": "new chat title",
            "created_at": "timestamp",
            "updated_at": "timestamp"
        }
    """
    try:
        data = request.get_json()

        if not data or "title" not in data:
            return jsonify({"error": "Request body must include 'title' field"}), 400

        title = data.get("title")
        user_id = request.user.id

        # Verify the chat belongs to the user
        chat_response = supabase_admin.table("chats").select("*") \
            .eq("id", chat_id) \
            .eq("user_id", user_id) \
            .execute()

        if not chat_response.data:
            return jsonify({"error": "Chat not found"}), 404

        # Update the chat title
        response = supabase_admin.table("chats").update({"title": title}) \
            .eq("id", chat_id) \
            .execute()

        return jsonify(response.data[0]), 200

    except Exception as e:
        logger.error(f"Error updating chat: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/chats/<chat_id>/messages", methods=["GET"])
@require_auth
async def get_chat_messages(chat_id: str):
    """
    Get all messages for a chat.

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        [
            {
                "id": "uuid",
                "chat_id": "uuid",
                "role": "user" | "assistant" | "system",
                "content": {...},
                "created_at": "timestamp"
            }
        ]
    """
    try:
        user_id = request.user.id

        # Verify the chat belongs to the user
        chat_response = supabase_admin.table("chats").select("*") \
            .eq("id", chat_id) \
            .eq("user_id", user_id) \
            .execute()

        if not chat_response.data:
            return jsonify({"error": "Chat not found"}), 404

        # Fetch messages
        messages_response = supabase_admin.table("chat_messages").select("*") \
            .eq("chat_id", chat_id) \
            .execute()

        return jsonify(messages_response.data), 200

    except Exception as e:
        logger.error(f"Error fetching chat messages: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/word-pairs", methods=["GET"])
@require_auth
async def get_word_pairs():
    """
    Get all word pairs for the current user.

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        [
            {
                "id": "uuid",
                "user_id": "uuid",
                "source_word": "word",
                "translated_word": "translation",
                "context_sentence": "example",
                "created_at": "timestamp"
            }
        ]
    """
    try:
        user_id = request.user.id

        response = supabase_admin.table("word_pairs").select("*") \
            .eq("user_id", user_id) \
            .execute()

        return jsonify(response.data), 200

    except Exception as e:
        logger.error(f"Error fetching word pairs: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


@app.route("/api/word-pairs/<word_pair_id>", methods=["DELETE"])
@require_auth
async def delete_word_pair(word_pair_id: str):
    """
    Delete a word pair.

    Headers:
        Authorization: Bearer <jwt_token>

    Response:
        {"success": true}
    """
    try:
        user_id = request.user.id

        # Verify the word pair belongs to the user
        word_pair_response = supabase_admin.table("word_pairs").select("*") \
            .eq("id", word_pair_id) \
            .eq("user_id", user_id) \
            .execute()

        if not word_pair_response.data:
            return jsonify({"error": "Word pair not found"}), 404

        # Delete the word pair
        supabase_admin.table("word_pairs").delete().eq("id", word_pair_id).execute()

        return jsonify({"success": True}), 200

    except Exception as e:
        logger.error(f"Error deleting word pair: {e}", exc_info=True)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500


if __name__ == "__main__":
    # Run the Flask app
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
