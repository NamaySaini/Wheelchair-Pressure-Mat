# Wheelchair Pressure Mat

An IoT wheelchair pressure-monitoring system with an ESP32 firmware, Expo/React Native mobile app, Node/Express backend, Supabase Auth + Postgres storage, and OpenAI-powered session/chat insights.

The app connects to a pressure mat over BLE, tracks sitting sessions, logs pressure metrics, records alert compliance, and lets each authenticated user view their own tracker, profile, chat history, and session data.

## Architecture

```text
[Velostat Pressure Mat]
        |
        | analog sensor grid
        v
[ESP32-C3 Firmware]
        |
        | BLE pressure stream + alert config
        v
[Expo React Native App]
        |
        | HTTPS/HTTP bearer-token API requests
        v
[Node.js Express Backend]
        |
        | Supabase service role client
        v
[Supabase Auth + Postgres]
        |
        | session/chat summarization context
        v
[OpenAI API]
```

## Repository Layout

```text
backend/     Node.js + Express REST API, Supabase data access, OpenAI LLM calls
frontend/    Expo/React Native app, BLE connection, auth screens, tracker/chat UI
firmware/    ESP32-C3 PlatformIO firmware for pressure scanning + BLE
```

## Core Features

- Supabase email/password authentication.
- Per-user profile, sessions, readings, snapshots, alert events, tracker views, and chat history.
- Persistent mobile auth sessions with logout.
- BLE pressure streaming from the ESP32 PressureMat.
- Session lifecycle with alert/reposition tracking.
- Historical tracker buckets by day, week, month, and year.
- OpenAI-backed chat and session summaries grounded in stored user data.
- Seed script for generating realistic demo history for a selected Supabase Auth user.

## Prerequisites

- Node.js and npm.
- Expo development environment.
- iOS Simulator, Android emulator, or physical device with a development build.
- Supabase project.
- OpenAI API key for chat/session summaries.
- PlatformIO if building firmware.

Do not use plain Expo Go for the full app. This project uses native modules such as BLE and AsyncStorage, so use a dev build with `expo run:ios` or `expo run:android`.

## Supabase Setup

1. Create or open a Supabase project.
2. Run the SQL migration in `backend/migrations/001_sessions_chat.sql` using the Supabase SQL editor.
3. Enable email/password auth in `Authentication -> Providers -> Email`.
4. Copy the project URL and publishable/anon key from `Project Settings -> API Keys`.
5. Copy the service role key from `Project Settings -> API Keys`.

Key placement:

- Frontend uses only the publishable/anon key.
- Backend uses the service role key.
- Never put the service role key in `frontend/.env`.

## Environment Variables

Create `backend/.env`:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
PORT=3000

# Optional: used only by backend/scripts/seed.js.
DEMO_USER_ID=00000000-0000-0000-0000-000000000001
```

Create `frontend/.env`:

```bash
# Use your computer's LAN IP for physical-device testing.
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:3000
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_publishable_or_anon_key
```

For iOS Simulator, `EXPO_PUBLIC_API_URL=http://localhost:3000` can work. For a physical phone, use your Mac's LAN IP:

```bash
ipconfig getifaddr en0
```

If that returns nothing, try:

```bash
ipconfig getifaddr en1
```

## Install Dependencies

Backend:

```bash
cd backend
npm install
```

Frontend:

```bash
cd frontend
npm install
```

Firmware:

```bash
cd firmware
pio run
```

## Run Locally

Start the backend:

```bash
cd backend
npm run dev
```

Start the frontend Metro server:

```bash
cd frontend
npx expo start -c
```

Build/run the native development app:

```bash
cd frontend
npx expo run:ios
```

For a physical iPhone:

```bash
cd frontend
npx expo run:ios --device
```

If native dependencies were added or changed, delete the old app from the simulator/device and rebuild it.

## Authentication Test Flow

1. Start backend and frontend.
2. Open the app and confirm the login screen appears.
3. Sign up with a new email/password.
4. If email confirmation is enabled in Supabase, confirm the email before logging in.
5. Confirm Settings shows the authenticated user's email.
6. Update Personal Information and confirm it persists after leaving and returning.
7. Log out from Settings and confirm the app returns to login.
8. Create or log into a second account and confirm it does not show the first account's profile/session/chat/tracker data.

## Seed Demo Data Into A Real User

The seed script writes data for the UUID in `DEMO_USER_ID`. To seed a user you created through Supabase Auth:

1. Sign up or log in once in the app.
2. In Supabase, go to `Authentication -> Users`.
3. Copy that user's UID.
4. Set it in `backend/.env`:

```bash
DEMO_USER_ID=that-auth-user-uuid
```

5. Run:

```bash
cd backend
npm run seed
```

The seed script creates demo `user_profiles`, `sessions`, `readings`, `reading_snapshots`, and `alert_events` for that one user. It does not seed `chat_messages` or `session_summaries`.

After seeding, log in as that user and test:

- Tracker history.
- Chat questions such as "Which side has more pressure this month?"
- User isolation by logging into a different account.

Warning: `npm run seed` wipes and reseeds session-related data for the configured `DEMO_USER_ID`.

## OpenAI LLM Setup

The backend uses OpenAI for:

- Chat replies in `backend/src/llm/runChat.js`.
- Session summaries in `backend/src/llm/summarizeSession.js`.

Set:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

Then restart the backend:

```bash
cd backend
npm run dev
```

OpenAI API usage is billed by OpenAI. Keep the key only in `backend/.env`.

## Backend API Notes

Most app-data routes require a Supabase Auth bearer token:

- `/users`
- `/sessions`
- `/readings`
- `/snapshots`
- `/alert-events`
- `/chat`
- `/tracker`
- `/pressure`
- `/settings`

The frontend automatically attaches the current Supabase access token through `frontend/lib/backend.ts`.

## Verification Commands

Frontend type check:

```bash
cd frontend
npx tsc --noEmit
```

Frontend lint:

```bash
cd frontend
npm run lint
```

Backend syntax check:

```bash
for file in backend/src/**/*.js backend/src/*.js; do node --check "$file" || exit 1; done
```

## Troubleshooting

If AsyncStorage is null on iOS, rebuild the native app:

```bash
cd frontend
npx expo start -c
npx expo run:ios
```

If tunnel mode fails, use LAN instead:

```bash
cd frontend
npx expo start -c
```

If the phone cannot reach the backend, confirm `EXPO_PUBLIC_API_URL` uses your computer's LAN IP and that the backend is running on port `3000`.

If chat fails, confirm `OPENAI_API_KEY` is set in `backend/.env` and restart the backend.

If seeded data does not appear, confirm `DEMO_USER_ID` exactly matches the Supabase Auth user UID you are logged in as.

## Firmware

Firmware details are in `firmware/README.md`. The firmware scans the pressure grid, streams data over BLE, and accepts alert-configuration writes from the mobile app.
