# Triage Bot

A post-appointment follow-up Discord bot that checks in on patients after a medical visit, screens for potential drug interactions, and flags concerns to the care team.

---

## Prerequisites

- Node.js 18+
- A Discord application & bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- An Anthropic API key

---

## Setup

### 1. Install dependencies

```bash
cd triage-bot
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

`DISCORD_CLIENT_ID` is the **Application ID** found on the General Information page of your Discord app.

### 3. Enable required bot intents

In the Discord Developer Portal, go to your application → **Bot** → **Privileged Gateway Intents** and enable:

- **Message Content Intent**
- **Server Members Intent** (optional, but recommended)

Under **OAuth2 → URL Generator**, select the following scopes and permissions when inviting the bot:

| Scopes | Bot Permissions |
|--------|----------------|
| `bot` | Send Messages |
| `applications.commands` | Read Messages / View Channels |
| | Use Slash Commands |
| | Send Messages in Threads |

### 4. Register slash commands

Run this **once** (or whenever you change commands):

```bash
npm run register
```

This registers the `/checkin` command globally. Global commands may take up to an hour to propagate. For faster testing during development, register guild-specific commands by modifying `register-commands.js` to use `Routes.applicationGuildCommands(clientId, guildId)`.

### 5. Run the bot

```bash
npm start
```

You should see: `Triage is online as Triage#XXXX`

---

## Usage

1. In any server where Triage is present, type `/checkin`.
2. Triage greets you and presents a symptom checklist (Discord select menu).
3. Select all applicable symptoms and submit.
4. Triage sends you a DM asking for any additional free-text details.
5. Reply in the DM with your message. Triage responds with a Claude-powered acknowledgment.
6. If 3+ symptoms are selected or emergency keywords are detected, Triage issues an emergency redirect.
7. All session data is logged to `responses.json`.

---

## Project Structure

```
triage-bot/
├── index.js               Discord client, event routing (platform-specific)
├── handler.js             Conversation state machine (platform-agnostic)
├── prompt.js              System prompt and Triage persona strings (platform-agnostic)
├── checklist.js           Symptom definitions and flagging logic (platform-agnostic)
├── logger.js              Session logging to responses.json (platform-agnostic)
├── register-commands.js   One-time slash command registration script
├── .env.example           Environment variable template
├── package.json
└── responses.json         Auto-created at runtime; stores anonymized session logs
```

### Platform-agnostic architecture

Only `index.js` contains Discord-specific code. When migrating to Telegram (or any other platform), you only need to write a new entry point that calls the same `handler.js` functions:

| Function | Description |
|---|---|
| `startCheckin(userId)` | Initializes a session, returns greeting + symptom list |
| `handleSymptomSelection(userId, values)` | Records selections, returns follow-up prompt |
| `handleFreeText(userId, text)` | Calls Claude, evaluates flags, logs session, returns full response |
| `getSessionStage(userId)` | Returns current session stage |
| `clearSession(userId)` | Clears session state |

---

## Logging

Sessions are appended to `responses.json` with the following shape:

```json
{
  "timestamp": "2026-03-21T12:00:00.000Z",
  "userHash": "<sha256 of Discord user ID>",
  "symptoms": ["nausea", "fatigue"],
  "freeText": "I've also had some mild headaches.",
  "emergencyFlag": false
}
```

Raw Discord user IDs are never stored — only their SHA-256 hash. This logging layer is intended to be replaced with an API call to the application backend.

---

## Notes

- This is a proof of concept.
- Triage is **not** a medical device and **not** a substitute for professional medical advice.
- Always ensure compliance with applicable healthcare privacy regulations (e.g., HIPAA) before deploying in a production environment.
