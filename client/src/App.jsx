import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import './App.css';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:4000';
const MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo'];

let socket;

function getSocket() {
  if (!socket) socket = io(SOCKET_URL);
  return socket;
}

export default function App() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [model, setModel] = useState('gpt-4o-mini');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, streamBuffer]);

  useEffect(() => {
    const s = getSocket();

    s.on('conversation:created', (convo) => {
      setActiveId(convo.id);
      setMessages([]);
      setConversations(prev => [{ id: convo.id, title: convo.title, model: convo.model }, ...prev]);
    });

    s.on('conversation:history', (convo) => {
      setMessages(convo.messages);
      setModel(convo.model);
    });

    s.on('message:user', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    s.on('stream:start', () => {
      setStreaming(true);
      setStreamBuffer('');
    });

    s.on('stream:delta', ({ delta }) => {
      setStreamBuffer(prev => prev + delta);
    });

    s.on('stream:end', ({ message }) => {
      setStreaming(false);
      setStreamBuffer('');
      setMessages(prev => [...prev, message]);
      setConversations(prev =>
        prev.map(c => c.id === message.conversationId ? { ...c, title: c.title } : c)
      );
    });

    s.on('error', ({ message }) => {
      setStreaming(false);
      setMessages(prev => [...prev, { id: Date.now(), role: 'error', content: message }]);
    });

    return () => {
      s.off('conversation:created');
      s.off('conversation:history');
      s.off('message:user');
      s.off('stream:start');
      s.off('stream:delta');
      s.off('stream:end');
      s.off('error');
    };
  }, []);

  const newConversation = () => {
    getSocket().emit('conversation:create', { model });
  };

  const joinConversation = (id) => {
    setActiveId(id);
    getSocket().emit('conversation:join', id);
  };

  const sendMessage = (e) => {
    e?.preventDefault();
    if (!input.trim() || streaming || !activeId) return;
    getSocket().emit('message:send', { conversationId: activeId, content: input.trim(), model });
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <span className="logo">⬡ NeuralChat</span>
          <button className="icon-btn" onClick={() => setSidebarOpen(o => !o)}>☰</button>
        </div>
        <button className="new-chat-btn" onClick={newConversation}>+ New Chat</button>
        <div className="model-select-wrap">
          <label>Model</label>
          <select value={model} onChange={e => setModel(e.target.value)}>
            {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="convo-list">
          {conversations.length === 0 && <p className="empty-hint">No conversations yet</p>}
          {conversations.map(c => (
            <button
              key={c.id}
              className={`convo-item ${c.id === activeId ? 'active' : ''}`}
              onClick={() => joinConversation(c.id)}
            >
              <span className="convo-icon">💬</span>
              <span className="convo-title">{c.title}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main chat area */}
      <main className="chat-main">
        {!activeId ? (
          <div className="welcome">
            <div className="welcome-icon">⬡</div>
            <h1>NeuralChat AI</h1>
            <p>Multi-model AI chat with real-time streaming and conversation memory.</p>
            <button className="start-btn" onClick={newConversation}>Start a Conversation</button>
          </div>
        ) : (
          <>
            <div className="messages">
              {messages.map(msg => (
                <div key={msg.id} className={`message message--${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '👤' : msg.role === 'assistant' ? '⬡' : '⚠'}
                  </div>
                  <div className="message-body">
                    <div className="message-content">{msg.content}</div>
                    {msg.model && <div className="message-meta">{msg.model}</div>}
                  </div>
                </div>
              ))}
              {streaming && streamBuffer && (
                <div className="message message--assistant">
                  <div className="message-avatar">⬡</div>
                  <div className="message-body">
                    <div className="message-content">{streamBuffer}<span className="cursor" /></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form className="input-area" onSubmit={sendMessage}>
              <textarea
                ref={inputRef}
                className="input-box"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message NeuralChat... (Enter to send, Shift+Enter for newline)"
                rows={1}
                disabled={streaming}
              />
              <button type="submit" className="send-btn" disabled={streaming || !input.trim()}>
                {streaming ? '⏳' : '↑'}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
