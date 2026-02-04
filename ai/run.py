import asyncio
import logging
import os
import warnings
from functools import wraps
from typing import Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from supabase import create_client, Client

from crews.random_phrase_crew.crew import RandomPhraseCrew
from crews.random_phrase_crew.schemas import PhraseOutput

from lib.tracer import traceable

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


if __name__ == "__main__":
    # Run the Flask app
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=True)
