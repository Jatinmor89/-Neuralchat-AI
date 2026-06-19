# ⬡ NeuralChat AI

Real-time AI chat platform with streaming responses, conversation memory, and multi-model support.

![NeuralChat](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat&logo=node.js)
![Socket.io](https://img.shields.io/badge/Socket.io-4-black?style=flat&logo=socket.io)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=flat&logo=openai)

## Features

- 🔴 **Real-time streaming** — responses stream token by token via WebSocket
- 🧠 **Conversation memory** — full message history sent with each request (last 20 messages)
- 🤖 **Multi-model support** — switch between GPT-4o, GPT-4o-mini, GPT-3.5-turbo mid-conversation
- 💬 **Multiple conversations** — sidebar with conversation list and history
- ⚡ **Rate limiting** — 60 requests/minute per IP
- 🔒 **Helmet.js** security headers

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Socket.io-client |
| Backend | Node.js, Express, Socket.io |
| AI | OpenAI API (streaming) |
| Real-time | WebSockets |

## Getting Started

```bash
# Clone the repo
git clone https://github.com/jatin/neuralchat-ai
cd neuralchat-ai

# Install all dependencies
npm run install:all

# Set up environment
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Run server + client (in two terminals)
npm run dev          # server on :4000
npm run client       # React on :3000
```

## Project Structure

```
neuralchat-ai/
├── server/
│   └── index.js          # Express + Socket.io server, OpenAI streaming
├── client/
│   └── src/
│       ├── App.jsx        # Main chat UI
│       └── App.css        # Styles
├── .env.example
└── package.json
```

## How It Works

1. Client connects via WebSocket on load
2. User creates a conversation → server stores it in memory with a UUID
3. User sends a message → server calls OpenAI with full history
4. OpenAI streams tokens back → server forwards each delta to client via `stream:delta` events
5. Client appends deltas in real-time → smooth streaming effect

---

Built by [Jatin](https://github.com/jatinmor89) — 2026
