require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

const io = new Server(server, {
  cors: { origin: CLIENT_URL, methods: ['GET', 'POST'] }
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));

// Serve React build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// In-memory conversation store (swap with Redis in production)
const conversations = new Map();

// ── REST: get conversation history ──
app.get('/api/conversations/:id', (req, res) => {
  const convo = conversations.get(req.params.id);
  if (!convo) return res.status(404).json({ error: 'Conversation not found' });
  res.json(convo);
});

// ── REST: list all conversations ──
app.get('/api/conversations', (req, res) => {
  const list = [...conversations.entries()].map(([id, c]) => ({
    id,
    title: c.title,
    model: c.model,
    messageCount: c.messages.length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }));
  res.json(list);
});

// ── REST: delete conversation ──
app.delete('/api/conversations/:id', (req, res) => {
  conversations.delete(req.params.id);
  res.json({ success: true });
});

// ── REST: health ──
app.get('/api/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// ── Catch-all: serve React app ──
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

// ── WebSocket: real-time streaming ──
io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  socket.on('conversation:create', ({ model = 'gpt-4o-mini', systemPrompt } = {}) => {
    const id = uuidv4();
    const convo = {
      id,
      title: 'New Conversation',
      model,
      systemPrompt: systemPrompt || 'You are a helpful, concise assistant.',
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    conversations.set(id, convo);
    socket.join(id);
    socket.emit('conversation:created', convo);
  });

  socket.on('conversation:join', (id) => {
    const convo = conversations.get(id);
    if (!convo) return socket.emit('error', { message: 'Conversation not found' });
    socket.join(id);
    socket.emit('conversation:history', convo);
  });

  socket.on('message:send', async ({ conversationId, content, model }) => {
    const convo = conversations.get(conversationId);
    if (!convo) return socket.emit('error', { message: 'Conversation not found' });

    const userMsg = { id: uuidv4(), role: 'user', content, timestamp: new Date().toISOString() };
    convo.messages.push(userMsg);

    if (convo.messages.length === 1) {
      convo.title = content.slice(0, 40) + (content.length > 40 ? '...' : '');
    }

    socket.emit('message:user', userMsg);
    socket.emit('stream:start', { messageId: userMsg.id });

    try {
      const activeModel = model || convo.model;
      const stream = await openai.chat.completions.create({
        model: activeModel,
        stream: true,
        messages: [
          { role: 'system', content: convo.systemPrompt },
          ...convo.messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
        ],
      });

      let fullContent = '';
      const assistantMsgId = uuidv4();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        fullContent += delta;
        socket.emit('stream:delta', { messageId: assistantMsgId, delta });
      }

      const assistantMsg = {
        id: assistantMsgId,
        role: 'assistant',
        content: fullContent,
        model: activeModel,
        timestamp: new Date().toISOString(),
      };
      convo.messages.push(assistantMsg);
      convo.updatedAt = new Date().toISOString();
      socket.emit('stream:end', { messageId: assistantMsgId, message: assistantMsg });

    } catch (err) {
      console.error('[openai error]', err.message);
      socket.emit('error', { message: 'AI response failed. Check your API key.' });
    }
  });

  socket.on('conversation:setModel', ({ conversationId, model }) => {
    const convo = conversations.get(conversationId);
    if (convo) { convo.model = model; socket.emit('conversation:modelChanged', { model }); }
  });

  socket.on('disconnect', () => console.log(`[socket] disconnected: ${socket.id}`));
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 NeuralChat server running on port ${PORT}`));
