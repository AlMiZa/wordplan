# Agent Instructions

## Project Overview

Wordpan is a full-stack AI-powered language learning application demonstrating modern AI agent integration with CrewAI, Supabase, and comprehensive observability using Arize Phoenix.

### Architecture
- **Frontend**: React 19.1 + TypeScript 5.9 + Vite 7 + Tailwind CSS 4 + Radix UI
- **AI Backend**: Python 3.13 + Flask + CrewAI 0.201 + LiteLLM
- **Database**: PostgreSQL via Supabase with Row-Level Security (RLS)
- **Observability**: Arize Phoenix 12.4.0 with OpenTelemetry tracing
- **Containerization**: Docker Compose with hot reload

### Key Features
1. **Random Phrase Generator**: Bilingual phrase generation using AI
2. **Pronunciation Tips**: AI-powered pronunciation guidance with caching
3. **Smart Tutor Chat**: Multi-agent conversational AI for language learning
4. **Language Selection**: Target language preferences (Polish, Belarusian, Italian)
5. **Flashcard System**: Save vocabulary pairs for later review

### Project Structure
```
wordpan/
├── ai/                    # Python AI backend
│   ├── src/
│   │   ├── crews/         # CrewAI agent definitions
│   │   │   ├── base/      # Shared LLM configuration
│   │   │   ├── random_phrase_crew/
│   │   │   ├── pronunciation_tips_crew/
│   │   │   └── chat_tutor_crew/
│   │   └── lib/           # Shared utilities (tracer)
│   ├── run.py             # Flask API server
│   └── pyproject.toml      # Python dependencies
├── web/                   # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   └── lib/           # Utilities and services
│   └── package.json
└── supabase/              # Database configuration
    └── migrations/        # SQL migration files
```

## Database Operations

**CRITICAL: Never run database migration commands in this project.**

When working with Supabase migrations:
- Use `supabase migration new <name>` to create new migration files only
- **DO NOT** run `supabase db reset` - it will wipe all data
- **DO NOT** run `supabase db push` - migrations should be applied manually by the developer

Only create migration files. Let the developer apply them manually.

## Development Guidelines

### Request Flow (AI Phrase Generation)
1. User clicks "Generate Phrase" → Frontend fetches 3 random words from Supabase
2. Frontend sends words + JWT token to AI backend `/api/random-phrase`
3. Backend validates JWT with Supabase
4. Backend fetches user profile/context from Supabase
5. CrewAI crew executes with user context
6. All AI operations traced via OpenTelemetry → Phoenix
7. Backend returns generated phrase + words
8. Frontend displays result

### Authentication Flow
- Supabase Auth with JWT tokens
- Profile auto-created via database trigger on signup
- Backend validates JWT before processing requests
- RLS policies enforce data access control

### Adding New CrewAI Crews

1. Create crew directory structure:
   ```bash
   mkdir -p ai/src/crews/my_new_crew/config
   ```

2. Define agents in `config/agents.yaml`:
   ```yaml
   my_agent:
     role: "Agent Role"
     goal: "What the agent should achieve"
     backstory: "Agent's background and expertise"
   ```

3. Define tasks in `config/tasks.yaml`:
   ```yaml
   my_task:
     description: "Task description with {variable}"
     expected_output: "Expected output format"
     agent: my_agent
   ```

4. Create schemas in `schemas.py`:
   ```python
   from pydantic import BaseModel, Field

   class MyOutput(BaseModel):
       field_name: str = Field(description="Field description")
   ```

5. Create crew class in `crew.py` using `@CrewBase` decorator:
   ```python
   from crewai import Agent, Crew, Task, Process
   from crewai.project import CrewBase, agent, crew, task
   from src.crews.base.llm import DEFAULT_LLM

   @CrewBase
   class MyNewCrew():
       agents: list[Agent]
       tasks: list[Task]

       @agent
       def my_agent(self) -> Agent:
           return Agent(
               config=self.agents_config['my_agent'],
               llm=DEFAULT_LLM
           )

       @task
       def my_task(self) -> Task:
           return Task(
               config=self.tasks_config['my_task'],
               output_pydantic=MyOutput
           )

       @crew
       def crew(self) -> Crew:
           return Crew(
               agents=self.agents,
               tasks=self.tasks,
               process=Process.sequential
           )
   ```

6. Add endpoint in `ai/run.py`:
   ```python
   from src.crews.my_new_crew.crew import MyNewCrew
   from src.crews.my_new_crew.schemas import MyOutput

   @app.route('/api/my-endpoint', methods=['POST'])
   @require_auth
   async def my_endpoint():
       # Get user context
       user_id = request.user.id
       user_context, target_language = await get_user_context(user_id)

       # Run crew
       inputs = {'user_context': user_context, 'target_language': target_language}
       result = await MyNewCrew().crew().kickoff_async(inputs=inputs)

       if hasattr(result, 'pydantic'):
           return jsonify(result.pydantic.model_dump()), 200

       return jsonify({"error": "Unexpected result format"}), 500
   ```

### Agent Configuration

**LLM Provider** (`ai/src/crews/base/llm.py`):
- Default: Groq Llama 3.3 70B Versatile
- Configurable via environment variables
- LiteLLM abstraction allows easy provider switching

**Agent Patterns**:
- Use descriptive roles and goals
- Provide detailed backstory for context
- Include expected output format in task descriptions
- Use Pydantic models for structured outputs

**Tool Calling**:
- Define tools as Python functions
- Use CrewAI's @tool decorator
- Pass tools to agents via `tools` parameter
- Tool results are automatically integrated into agent context

### Existing Crews

**RandomPhraseCrew** (`ai/src/crews/random_phrase_crew/`)
- Single agent: `phrase_creator`
- Creates bilingual phrases from random word lists
- Supports Polish, Belarusian, and Italian translations
- Output: `PhraseOutput` (phrase, phrase_target_lang, target_language, words_used)

**PronunciationTipsCrew** (`ai/src/crews/pronunciation_tips_crew/`)
- Single agent: `pronunciation_guide`
- Provides IPA transcriptions, syllable breakdowns, memory aids
- Uses session-based caching via Supabase
- Output: `PronunciationTipsOutput` (word, phonetic_transcription, syllables, pronunciation_tips, memory_aids, common_mistakes)

**ChatTutorCrew** (`ai/src/crews/chat_tutor_crew/`)
- Three agents: `router_agent`, `translation_agent`, `vocabulary_agent`
- Routes requests to appropriate specialists
- Supports tool calling for saving vocabulary pairs
- Enforces domain boundaries (language learning only)
- Output: `TutorResponse` (response_type, content, data, tool_calls)

### Tracing

All crew operations are automatically traced via OpenTelemetry:
- View traces in Phoenix UI: http://localhost:6006
- See agent reasoning chains
- Monitor LLM calls and latency
- Track token usage

### Environment Configuration

**Frontend** (`web/.env.local`):
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_AI_SERVICE_URL` - AI backend base URL

**Backend** (`ai/.env`):
- `GROQ_API_KEY` (or `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) - LLM provider key
- `PHOENIX_PROJECT_NAME` - Project name in Phoenix
- `PHOENIX_COLLECTOR_ENDPOINT` - Phoenix OTLP endpoint
- `SUPABASE_URL` - Supabase URL (use `http://host.docker.internal:54321` in Docker)
- `SUPABASE_ANON_KEY` - Supabase anonymous key

**Phoenix** (`phoenix/.env`):
- `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_DB`, `POSTGRES_PASSWORD`
- `PHOENIX_SQL_DATABASE_URL` - Phoenix database connection string

## Common Tasks

### Running Services
```bash
# All services
docker compose up --build

# Individual services
cd web && npm run dev
cd ai && uv run python run.py
supabase start
docker compose up phoenix phoenix-db
```

### Database Operations
```bash
# Create migration (ONLY command allowed)
supabase migration new <descriptive_name>

# Access database
supabase db psql

# Open Supabase Studio
open http://127.0.0.1:54323
```

### Debugging
- **Frontend**: React DevTools, Vite terminal logs, Network tab
- **Backend**: debugpy on port 5678 (VS Code launch config in `.vscode/launch.json`)
- **AI Observability**: Phoenix UI at http://localhost:6006
- **Database**: Supabase Studio at http://127.0.0.1:54323

## Important Constraints

1. **Database Migrations**: Never run `supabase db reset` or `supabase db push`
2. **RLS Policies**: All database tables use Row-Level Security
3. **JWT Validation**: Backend must validate tokens before processing
4. **OpenTelemetry**: All AI operations must be traced
5. **User Context**: AI crews should incorporate user profile data
6. **LiteLLM**: Use LiteLLM for LLM provider abstraction
7. **Hot Reload**: Docker setup supports hot reload for development

## Security Notes

- Database has Row-Level Security (RLS) - users can only access their own data
- JWT tokens stored in Supabase client (localStorage)
- Backend validates all tokens with Supabase before processing
- Auto-created profiles via database triggers
