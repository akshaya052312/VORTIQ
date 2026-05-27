# Vortiq Frontend

The React frontend for the Vortiq AI meeting intelligence platform built with Vite.

## Tech Stack
- **Library**: React
- **Build Tool**: Vite
- **Routing**: React Router (DOM)
- **API Client**: Axios

## Project Structure
- **`src/api`**: Holds the centralized `axiosInstance` configuration and separate modules (`auth.js`, `meetings.js`) for calling REST endpoints.
- **`src/components`**: Contains shared layout and structural components like the `MeetingLayout` wrapper.
- **`src/context`**: Manages global React contexts (such as `AuthContext.jsx` for tracking session states and JWT tokens).
- **`src/hooks`**: Custom hooks encapsulating complex stateful logic, including `useLiveTranscription.js` (binary WebSocket recorder streams) and `useCollaborativeNotes.js` (live notes editing sockets).
- **`src/pages`**: Holds screen components that represent route entry points.

## Setup Instructions

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd vortiq-frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your values (see the [Environment Variables](#environment-variables) section below).
   ```bash
   cp .env.example .env
   ```

4. **Start the local development server**:
   ```bash
   npm run dev
   ```

## Environment Variables
Create a `.env` file in the root directory. Never commit secrets to the repository. The following variables are supported:

- **`VITE_API_BASE_URL`**: `VITE_API_BASE_URL=http://localhost:8000`
  - The base HTTP URL of the backend Django REST API server.
- **`VITE_WS_BASE_URL`**: `VITE_WS_BASE_URL=localhost:8000`
  - The hostname and port (without protocol) of the backend WebSocket Channels gateway.

## Pages
Vortiq Frontend contains the following pages:

- **Login**: Authenticates users using email/password and saves JWT credentials.
- **Register**: Registers new users with full name, email, and password.
- **Dashboard**: Central hub to list recent meetings, check their status, launch live recording session flows, or upload recordings.
- **Upload**: Uploads offline audio recordings (`.mp3`, `.wav`, `.m4a`) to trigger asynchronous transcriptions.
- **MeetingDetail**: Displays complete meeting meta details, active editor user avatars, editable summaries, and interactive collapsible transcripts.
- **MeetingNotes**: A dedicated page switcher displaying structured AI tabs (Summary, Action Items, Speaker Breakdown, Decisions, and Open Questions).
- **Integrations**: A settings page listing connected integrations cards (Slack, Notion, and Google Calendar) with OAuth start actions.
