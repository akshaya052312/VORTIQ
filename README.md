# Vortiq

An AI-powered meeting intelligence platform built with Django.

## Tech Stack
- **Languages & Frameworks**: Python, Django, Django REST Framework
- **Database & Services**: PostgreSQL, Celery, Redis
- **AI & Processing**: OpenAI Whisper, Groq (Llama 3.3)
- **Real-Time Communication**: Django Channels, Daphne

## Project Structure
- **`users`**: Manages custom user profiles, registration, and JWT-based authentication.
- **`meetings`**: Handles meeting metadata creation, uploads of audio recordings, and lifecycle statuses.
- **`transcriptions`**: Processes raw audio using Whisper, cleans transcripts, generates structured meeting insights via LLMs, and powers real-time WebSockets.
- **`integrations`**: Implements OAuth flows and delivery runner jobs for Slack, Notion, and Google Calendar.

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd vortiq-backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv
   # On Windows (PowerShell):
   .venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your values (see the [Environment Variables](#environment-variables) section below).
   ```bash
   cp .env.example .env
   ```

5. **Run database migrations**:
   ```bash
   python manage.py migrate
   ```

6. **Start the development server**:
   ```bash
   python manage.py runserver
   ```

## Running Celery
To process audio transcription and structured notes generation in the background, run the Celery worker:
```bash
celery -A vortiq worker --loglevel=info -P solo
```

## Environment Variables
The following environment variables are supported by Vortiq. Please define them in your `.env` file using placeholder formatting as below (never commit real credentials):

- **`SECRET_KEY`**: `SECRET_KEY=your-secret-key-here`
  - Django secret key used for session signing and cryptographic utilities.
- **`DEBUG`**: `DEBUG=True`
  - Set to `True` for development/testing, `False` in production.
- **`DATABASE_URL`**: `DATABASE_URL=postgresql://user:password@localhost:5432/vortiq`
  - Connection URI for your PostgreSQL database.
- **`REDIS_URL`**: `REDIS_URL=redis://localhost:6379/0`
  - Message broker URI for Celery background worker tasks.
- **`ALLOWED_HOSTS`**: `ALLOWED_HOSTS=localhost,127.0.0.1`
  - Comma-separated list of hostnames allowed to connect to this server.
- **`GROQ_API_KEY`**: `GROQ_API_KEY=your-groq-api-key-here`
  - API key used to access Groq cloud inference engine models.
- **`GEMINI_API_KEY`**: `GEMINI_API_KEY=your-gemini-api-key-here`
  - API key used to access Google Gemini LLM API.
- **`SLACK_CLIENT_ID`**: `SLACK_CLIENT_ID=your-slack-client-id`
  - Client ID of your registered Slack App for Slack OAuth connection flow.
- **`SLACK_CLIENT_SECRET`**: `SLACK_CLIENT_SECRET=your-slack-client-secret`
  - Client secret of your registered Slack App for Slack OAuth connection flow.
- **`SLACK_REDIRECT_URI`**: `SLACK_REDIRECT_URI=http://localhost:8000/api/integrations/slack/callback/`
  - Redirect callback URI registered in Slack Developer Console.
- **`NOTION_CLIENT_ID`**: `NOTION_CLIENT_ID=your-notion-client-id`
  - OAuth client ID of your Notion integration.
- **`NOTION_CLIENT_SECRET`**: `NOTION_CLIENT_SECRET=your-notion-client-secret`
  - OAuth client secret of your Notion integration.
- **`NOTION_REDIRECT_URI`**: `NOTION_REDIRECT_URI=http://localhost:8000/api/integrations/notion/callback/`
  - Redirect callback URI registered in Notion Developer Integrations console.
- **`GOOGLE_CLIENT_ID`**: `GOOGLE_CLIENT_ID=your-google-client-id`
  - Google OAuth 2.0 Web application Client ID.
- **`GOOGLE_CLIENT_SECRET`**: `GOOGLE_CLIENT_SECRET=your-google-client-secret`
  - Google OAuth 2.0 Web application Client secret.
- **`GOOGLE_REDIRECT_URI`**: `GOOGLE_REDIRECT_URI=http://localhost:8000/api/integrations/google/callback/`
  - Redirect callback URI registered in Google Cloud Console.
