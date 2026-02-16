# Claude Instructions

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
├── README.md
├── CLAUDE.md              # This file
├── AGENTS.md              # Agent-specific instructions
├── docker-compose.yml     # Service orchestration
├── .vscode/               # VS Code settings
├── ai/                    # Python AI backend
│   ├── src/
│   │   ├── crews/         # CrewAI agent definitions
│   │   │   ├── base/      # Shared LLM configuration
│   │   │   ├── random_phrase_crew/
│   │   │   ├── pronunciation_tips_crew/
│   │   │   └── chat_tutor_crew/
│   │   └── lib/           # Shared utilities (tracer)
│   ├── run.py             # Flask API server
│   ├── Dockerfile
│   └── pyproject.toml      # Python dependencies
├── web/                   # React frontend
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and services
│   │   ├── contexts/      # React contexts
│   │   └── layouts/       # Layout components
│   ├── Dockerfile
│   └── package.json
├── supabase/              # Database configuration
│   └── migrations/        # SQL migration files
└── phoenix/              # Observability configuration
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

### API Endpoints

**Phrase Generation**
- `POST /api/random-phrase` - Generate random phrase from words
  - Body: `{ "words": ["word1", "word2", ...] }`
  - Returns: `{ "phrase", "phrase_target_lang", "target_language", "words_used" }`

**Pronunciation Tips**
- `POST /api/pronunciation-tips` - Get pronunciation guidance
  - Body: `{ "word": "example" }`
  - Returns: `{ "word", "phonetic_transcription", "syllables", "pronunciation_tips", "memory_aids", "common_mistakes" }`

**Chat System**
- `POST /api/chat/message` - Send message and get AI response
  - Body: `{ "chat_id": "uuid" | null, "message": "text" }`
  - Returns: ChatMessage with structured content
- `GET /api/chats` - List all user chats
- `POST /api/chats` - Create new chat
- `DELETE /api/chats/:id` - Delete chat
- `GET /api/chats/:id/messages` - Get chat history

**User Profile**
- `PUT /api/profile/target-language` - Update language preference
  - Body: `{ "target_language": "polish" | "belarusian" | "italian" }`

### CrewAI Agents

**RandomPhraseCrew** (`ai/src/crews/random_phrase_crew/`)
- `phrase_creator` - Creates bilingual phrases from random words
- Output: `PhraseOutput` with phrase, translation, and words used

**PronunciationTipsCrew** (`ai/src/crews/pronunciation_tips_crew/`)
- `pronunciation_guide` - Provides pronunciation guidance
- Output: `PronunciationTipsOutput` with IPA, syllables, tips, and memory aids
- Uses session caching via Supabase for performance

**ChatTutorCrew** (`ai/src/crews/chat_tutor_crew/`)
- `router_agent` - Routes requests to appropriate specialists
- `translation_agent` - Handles translation requests
- `vocabulary_agent` - Suggests new vocabulary
- Tools: `save_word_pair` - Saves vocabulary to flashcard deck
- Output: `TutorResponse` with response_type, content, and optional tool_calls

### Database Schema

**Tables**
- `words` - Random word pool for phrase generation
- `profiles` - User profiles with context and target_language
- `pronunciation_tips_cache` - Cached pronunciation data per user
- `chats` - Chat session metadata (title, created_at, updated_at)
- `chat_messages` - Individual messages with JSONB content
- `word_pairs` - Saved vocabulary pairs with example sentences

**Row-Level Security (RLS)**
- All tables have RLS enabled
- Users can only access their own data
- Service role client used for profile operations to bypass RLS when needed

### Adding New CrewAI Crews

1. Create crew directory structure:
   ```bash
   mkdir -p ai/src/crews/my_new_crew/config
   ```

2. Define agents in `agents.yaml`:
   ```yaml
   my_agent:
     role: "Agent Role"
     goal: "What the agent should achieve"
     backstory: "Agent's background and expertise"
   ```

3. Define tasks in `tasks.yaml`:
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

5. Create crew class in `crew.py`:
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

### Environment Configuration

**Frontend** (`web/.env.local`):
```bash
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<your-anon-key>
VITE_AI_SERVICE_URL=http://localhost:8000
```

**Backend** (`ai/.env`):
```bash
GROQ_API_KEY=<your-groq-key>
PHOENIX_PROJECT_NAME=GOMANAI_WORKSHOP
PHOENIX_COLLECTOR_ENDPOINT=http://phoenix:4317/v1/traces
SUPABASE_URL=http://host.docker.internal:54321
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
PORT=8000
```

**Phoenix** (`phoenix/.env`):
```bash
POSTGRES_HOST=phoenix-db
POSTGRES_USER=postgres
POSTGRES_DB=postgres
POSTGRES_PASSWORD=postgres
PHOENIX_SQL_DATABASE_URL=postgresql+psycopg://postgres:postgres@phoenix-db/postgres
```

### Key Dependencies

**Frontend** (package.json):
```json
{
  "react": "^19.1.1",
  "typescript": "~5.9.3",
  "vite": "^7.1.7",
  "@supabase/supabase-js": "^2.75.0",
  "@tanstack/react-query": "^5.90.21",
  "react-router-dom": "^7.6.0",
  "tailwindcss": "^4.1.14",
  "@radix-ui/react-*": "UI component library"
}
```

**Backend** (pyproject.toml):
```toml
dependencies = [
    "flask[async]>=3.1.0",
    "crewai==0.201.0",
    "litellm",
    "arize-phoenix==12.4.0",
    "supabase>=2.22.0",
    "openinference-instrumentation-crewai",
    "openinference-instrumentation-litellm"
]
```

### Frontend Components

**Pages** (`web/src/pages/`)
- `dashboard.tsx` - Main dashboard with quick actions
- `login.tsx` - User login
- `signup.tsx` - User registration
- `words.tsx` - Word list with pagination
- `random-phrase.tsx` - Random phrase generator
- `chat.tsx` - AI chat tutor interface
- `settings.tsx` - User settings

**UI Components** (`web/src/components/`)
- `ui/` - Radix UI components (button, card, input, etc.)
- `chat/` - Chat-specific components
- `app-sidebar.tsx` - Main navigation sidebar
- `nav-main.tsx` - Navigation items
- `PronunciationTipsModal.tsx` - Pronunciation tips display

**Hooks** (`web/src/hooks/`)
- `use-words.ts` - Word list pagination
- `use-random-phrase.ts` - Random phrase generation
- `use-chat.ts` - Chat state management
- `use-mobile-detection.ts` - Mobile device detection

### Observability

**Phoenix Integration**
- All AI operations traced via OpenTelemetry
- Automatic instrumentation for CrewAI and LiteLLM
- Session-based span correlation
- Performance metrics dashboard at http://localhost:6006

**Traced Operations**
- Random phrase generation
- Pronunciation tips generation
- Chat message processing
- Tool invocations (save_word_pair)

**Viewing Traces**
1. Open Phoenix UI: http://localhost:6006
2. Select a trace to view:
   - Input parameters
   - Agent reasoning
   - LLM calls with latency
   - Token usage
   - Output results

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

### Running Services

**All Services (Recommended)**
```bash
docker compose up --build
```

**Individual Services**
```bash
# Frontend only
cd web && npm run dev

# AI backend only
cd ai && uv run python run.py

# Supabase (database & auth)
supabase start

# Observability
docker compose up phoenix phoenix-db
```

### Database Operations
```bash
# Create migration (ONLY command allowed)
supabase migration new <descriptive_name>

# Access database directly
supabase db psql

# Open Supabase Studio (GUI)
open http://127.0.0.1:54323

# View database logs
supabase logs
```

### Debugging

**Frontend**
- React DevTools browser extension
- Vite terminal logs for HMR updates
- Network tab for API calls
- Console for JavaScript errors
- Source maps enabled in development

**Backend**
- VS Code debugging: Press F5 with `.vscode/launch.json` configuration
- debugpy on port 5678
- Flask logs in terminal with traceback
- Use `logger.info()`, `logger.error()` for custom logging

**AI Observability**
- Phoenix UI: http://localhost:6006
- View traces for all AI operations
- Monitor LLM latency and token usage
- Inspect agent reasoning chains

**Database**
- Supabase Studio: http://127.0.0.1:54323
- Table editor for data inspection
- SQL editor for custom queries
- Real-time subscription monitoring
- RLS policy tester

## Important Constraints

1. **Database Migrations**: Never run `supabase db reset` or `supabase db push`
2. **RLS Policies**: All database tables use Row-Level Security
3. **JWT Validation**: Backend must validate tokens before processing
4. **OpenTelemetry**: All AI operations must be traced
5. **User Context**: AI crews should incorporate user profile data
6. **LiteLLM**: Use LiteLLM for LLM provider abstraction
7. **Hot Reload**: Docker setup supports hot reload for development
8. **Order By**: Supabase Python client uses `.order(column, desc=True/asc=True)` syntax

## Common Issues & Solutions

**Issue**: "BaseSelectRequestBuilder.order() takes 2 positional arguments"
- **Solution**: Use named parameters: `.order("column", desc=True)` or `.order("column", asc=True)`

**Issue**: CORS errors when calling API
- **Solution**: Ensure Authorization header is sent with JWT token
- Check `VITE_AI_SERVICE_URL` in `.env.local`

**Issue**: "Profile not found" errors
- **Solution**: Use `supabase_admin` (service role) for profile operations
- Profile auto-creation trigger may not have fired

**Issue**: Chat messages not saving
- **Solution**: Verify `chat_id` is passed correctly
- Check RLS policies on `chat_messages` table

**Issue**: Phoenix traces not appearing
- **Solution**: Check `PHOENIX_COLLECTOR_ENDPOINT` uses `http://phoenix:4317` in Docker
- Verify Phoenix service is running: `docker compose ps`

## Security Notes

- Database has Row-Level Security (RLS) - users can only access their own data
- JWT tokens stored in Supabase client (localStorage)
- Backend validates all tokens with Supabase before processing
- Auto-created profiles via database triggers
- Service role client only used when necessary (profile operations)
- All API endpoints require valid JWT except `/health`

## Performance Considerations

**Caching**
- Pronunciation tips cached per user session
- React Query caches API responses (5min staleTime, 30min gcTime)
- Consider cache invalidation strategies for user data updates

**AI Operations**
- CrewAI agents use sequential process by default
- LLM calls are the bottleneck - monitor via Phoenix
- Consider streaming responses for long-running operations
- Use `@traceable` decorator for custom span creation

**Database**
- RLS policies add query overhead
- Index on commonly filtered columns (user_id, chat_id)
- Use Supabase PostgREST for direct data access when possible
