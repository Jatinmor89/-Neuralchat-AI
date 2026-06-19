# NeuralChat AI — Deployment Guide

## ⚠️ Important Note on Vercel + Socket.io

Vercel runs **serverless functions** which don't support persistent WebSocket connections.
For full Socket.io support, deploy to one of these instead:

### ✅ Recommended: Railway (easiest, free tier)
1. Push code to GitHub
2. Go to https://railway.app → New Project → Deploy from GitHub
3. Set environment variables:
   - `OPENAI_API_KEY` = your key
   - `NODE_ENV` = production
   - `CLIENT_URL` = your Railway app URL (set after first deploy)
4. Railway auto-detects Node.js and runs `npm start`

### ✅ Alternative: Render
1. Push code to GitHub
2. Go to https://render.com → New Web Service → Connect GitHub
3. Build command: `npm run install:all && npm run build:client`
4. Start command: `npm start`
5. Set env vars: `OPENAI_API_KEY`, `NODE_ENV=production`

### ✅ Alternative: Fly.io
```bash
npm install -g flyctl
fly auth login
fly launch
fly secrets set OPENAI_API_KEY=your_key_here
fly deploy
```

## Running Locally

```bash
# 1. Install dependencies
npm run install:all

# 2. Create .env file
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Build React client
cd client && npm run build && cd ..

# 4. Start server (serves both API + React app)
NODE_ENV=production npm start

# OR run separately in dev mode:
npm run dev          # server on :4000
npm run client       # React on :3000
```

Open http://localhost:4000

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `OPENAI_API_KEY` | Your OpenAI API key | required |
| `PORT` | Server port | 4000 |
| `CLIENT_URL` | Frontend URL for CORS | http://localhost:3000 |
| `NODE_ENV` | Set to `production` to serve React build | - |
