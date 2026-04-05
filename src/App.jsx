import { useState, useRef, useEffect } from 'react';
import './App.css';

const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';
const STORAGE_KEY = 'openrouterChatSessions';

function App() {
  const [view, setView] = useState('home');
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoData, setPhotoData] = useState(null);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [assistantThinking, setAssistantThinking] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const messagesEndRef = useRef(null);
  const uploadInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const storedSessions = JSON.parse(saved);
        if (Array.isArray(storedSessions)) {
          setSessions(storedSessions);
        }
      } catch (error) {
        console.error('Load sessions failed:', error);
      }
    }
  }, []);

  useEffect(() => {
    const activeSession = sessions.find((session) => session.id === activeSessionId);
    setMessages(activeSession?.messages || []);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, assistantDraft, assistantThinking]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let refreshing = false;

    const configureUpdate = async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        if (!reg) return;

        if (reg.waiting) {
          setUpdateAvailable(true);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        });
      } catch (error) {
        console.error('Service worker update check failed:', error);
      }
    };

    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const handleWindowError = (event) => {
      console.error('Unhandled error:', event.error || event.message);
      setErrorMessage('Unexpected error occurred. Please refresh.');
    };

    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      setErrorMessage('Network or app error occurred. Try again later.');
    };

    configureUpdate();
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const saveSessions = (updatedSessions) => {
    setSessions(updatedSessions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSessions));
  };

  const saveAssistantMessage = (assistantMessage, currentMessages) => {
    const updatedMessages = [...currentMessages, assistantMessage];
    setMessages(updatedMessages);
    if (activeSessionId) {
      const updatedSessions = sessions.map((session) =>
        session.id === activeSessionId
          ? { ...session, messages: updatedMessages }
          : session
      );
      saveSessions(updatedSessions);
    }
  };

  const activateUpdate = async () => {
    if (!('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const createSession = () => {
    const id = crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`;
    const nextSession = {
      id,
      title: `Chat ${new Date().toLocaleString()}`,
      createdAt: Date.now(),
      messages: [],
    };

    const updatedSessions = [nextSession, ...sessions];
    saveSessions(updatedSessions);
    setActiveSessionId(id);
    setInput('');
    setPhotoPreview(null);
    setPhotoData(null);
    setView('chat');
  };

  const openHistory = () => {
    setView('history');
    setErrorMessage(null);
    setAssistantThinking(false);
  };

  const openSession = (sessionId) => {
    setActiveSessionId(sessionId);
    setView('chat');
    setErrorMessage(null);
    setAssistantThinking(false);
  };

  const deleteSession = (sessionId) => {
    const updatedSessions = sessions.filter((session) => session.id !== sessionId);
    saveSessions(updatedSessions);
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  const clearHistory = () => {
    saveSessions([]);
    setActiveSessionId(null);
    setMessages([]);
    setView('home');
  };

  const activeSession = sessions.find((session) => session.id === activeSessionId);

  const formatDate = (timestamp) => new Date(timestamp).toLocaleString();

  const createPayload = (text, photoPreview) => {
    const userContent = [{ type: 'text', text }];

    if (photoPreview) {
      userContent.push({ type: 'image_url', image_url: photoPreview });
    }

    return [
      {
        role: 'user',
        content: userContent,
      },
    ];
  };

  const createAssistantText = (content) => {
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map((item) => item?.text || '').join(' ').trim();
    }
    if (content?.text) {
      return content.text;
    }
    return 'No response content.';
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  const renderInlineText = (text) => {
    const parts = text.split(/(`[^`]+`)/g);
    return parts.map((part, index) => {
      if (/^`[^`]+`$/.test(part)) {
        return (
          <code key={index} className="inline-code">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const isTableSeparator = (line) => /^\s*\|?\s*[:-]+\s*(\|\s*[:-]+\s*)+\|?\s*$/.test(line);

  const renderMessageContent = (content) => {
    if (!content) return null;
    const lines = content.split('\n');
    const nodes = [];
    let index = 0;

    while (index < lines.length) {
      const line = lines[index];

      if (line.startsWith('```')) {
        const codeLines = [];
        index += 1;
        while (index < lines.length && !lines[index].startsWith('```')) {
          codeLines.push(lines[index]);
          index += 1;
        }
        index += 1;
        const codeText = codeLines.join('\n');
        nodes.push(
          <div key={`code-${index}`} className="code-block-wrapper">
            <button className="copy-button" onClick={() => copyToClipboard(codeText)}>
              Copy
            </button>
            <pre className="code-block">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        continue;
      }

      if (line.startsWith('> ')) {
        const quoteLines = [];
        while (index < lines.length && lines[index].startsWith('> ')) {
          quoteLines.push(lines[index].slice(2));
          index += 1;
        }
        nodes.push(
          <blockquote key={`quote-${index}`}>
            {renderInlineText(quoteLines.join(' '))}
          </blockquote>
        );
        continue;
      }

      if (line.includes('|') && isTableSeparator(lines[index + 1] || '')) {
        const headerCells = line.split('|').map((cell) => cell.trim()).filter((cell) => cell.length > 0);
        index += 2;
        const rows = [];
        while (index < lines.length && lines[index].includes('|')) {
          const rowCells = lines[index].split('|').map((cell) => cell.trim()).filter((cell) => cell.length > 0);
          rows.push(rowCells);
          index += 1;
        }
        nodes.push(
          <div key={`table-${index}`} className="markdown-table-wrapper">
            <table>
              <thead>
                <tr>{headerCells.map((header, colIndex) => <th key={colIndex}>{header}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }

      if (line.trim() === '') {
        nodes.push(<div key={`spacer-${index}`} className="message-spacer" />);
        index += 1;
        continue;
      }

      nodes.push(
        <p key={`text-${index}`}>
          {renderInlineText(line)}
        </p>
      );
      index += 1;
    }

    return nodes;
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image too large. Please use an image under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        // Compress image if too large
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxSize = 1200;
          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          if (compressed.length > 3 * 1024 * 1024) {
            setErrorMessage('Could not compress image. Try a smaller file.');
            return;
          }
          setPhotoPreview(compressed);
          setPhotoData(compressed.split(',')[1] ?? null);
        };
        img.src = result;
      }
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read image file.');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const openUpload = () => uploadInputRef.current?.click();
  const openCamera = () => cameraInputRef.current?.click();

  const sendMessage = async () => {
    if (!input.trim() && !photoPreview) return;
    setErrorMessage(null);
    setAssistantDraft(null);

    const text = input.trim() || 'Please describe the attached photo and answer based on it.';
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      photoPreview,
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setPhotoPreview(null);
    setPhotoData(null);
    setIsLoading(true);
    setAssistantThinking(true);

    if (activeSessionId) {
      const updatedSessions = sessions.map((session) =>
        session.id === activeSessionId
          ? { ...session, messages: currentMessages }
          : session
      );
      saveSessions(updatedSessions);
    }

    const sendWithRetry = async (retries = 2) => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45000); // 45 sec timeout

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'X-OpenRouter-Title': 'Minimal AI Chat',
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: createPayload(userMessage.content, userMessage.photoPreview),
            temperature: 0.2,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorBody = await response.text();
          let message = 'Unable to reach OpenRouter. Please try again.';
          try {
            const parsed = JSON.parse(errorBody);
            message = parsed.error?.message || parsed.message || message;
          } catch {
            message = errorBody || message;
          }
          throw new Error(message);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;
        const assistantText = createAssistantText(rawContent).trim() || 'No response content.';

        setAssistantThinking(false);
        const draftId = `${Date.now()}-assistant-draft`;
        const words = assistantText.split(' ');
        let revealIndex = 0;

        setAssistantDraft({
          id: draftId,
          role: 'assistant',
          content: '',
          fullContent: assistantText,
          isDraft: true,
        });

        const reveal = setInterval(() => {
          revealIndex += 1;
          setAssistantDraft((prev) => {
            if (!prev) {
              clearInterval(reveal);
              return null;
            }

            const nextContent = words.slice(0, revealIndex).join(' ');
            const nextDraft = { ...prev, content: nextContent };

            if (revealIndex >= words.length) {
              clearInterval(reveal);
              const assistantMessage = {
                id: `${Date.now()}-assistant`,
                role: 'assistant',
                content: assistantText,
              };
              setAssistantDraft(null);
              saveAssistantMessage(assistantMessage, currentMessages);
            }

            return nextDraft;
          });
        }, 30);
      } catch (error) {
        if (error.name === 'AbortError') {
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return sendWithRetry(retries - 1);
          }
          throw new Error('Request timed out. Please check your connection and try again.');
        }
        throw error;
      }
    };

    try {
      await sendWithRetry();
    } catch (error) {
      console.error('Send message failed:', error);
      setAssistantThinking(false);
      setAssistantDraft(null);
      setErrorMessage(
        error.message?.includes('network') || error.message?.includes('timeout')
          ? 'Network error. Check your connection and try again.'
          : error.message || 'Something went wrong. Please try again.'
      );
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-error`,
          role: 'assistant',
          content: error.message || 'Something went wrong. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="app-shell">
      {view === 'home' ? (
        <div className="home-card">
          <div className="hero-copy">
            <p className="greeting">{getGreeting()}</p>
            <h1>TECH AI</h1>
            <p className="subtext">Powered by Suraj Creation — for personal use only. All legal rights reserved.</p>
          </div>
          <div className="home-actions">
            <button className="start-button" onClick={createSession}>
              Start
            </button>
            <button className="history-button" onClick={openHistory}>
              History
            </button>
          </div>
        </div>
      ) : view === 'history' ? (
        <div className="history-card">
          <div className="history-header">
            <div>
              <p className="chat-title">History</p>
              <span className="chat-subtitle">Your past chats are saved by date and time.</span>
            </div>
            <div className="history-actions">
              {sessions.length > 0 && (
                <button className="delete-history-button" onClick={clearHistory}>
                  Clear all
                </button>
              )}
              <button className="back-button" onClick={() => setView('home')}>
                Home
              </button>
            </div>
          </div>

          <div className="history-list">
            {sessions.length === 0 ? (
              <div className="empty-state">No history yet. Start a chat to save your first session.</div>
            ) : (
              sessions.map((session) => (
                <div key={session.id} className="history-item-row">
                  <button className="history-item" onClick={() => openSession(session.id)}>
                    <div>
                      <div className="history-title">{session.title}</div>
                      <div className="history-meta">{formatDate(session.createdAt)}</div>
                    </div>
                    <div className="history-count">{session.messages.length} messages</div>
                  </button>
                  <button className="delete-session-button" onClick={() => deleteSession(session.id)}>
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="chat-card">
          {updateAvailable && (
            <div className="update-banner">
              New version available. Refresh to install the latest app.
              <button className="update-button" onClick={activateUpdate}>
                Update
              </button>
            </div>
          )}
          <div className="chat-header">
            <div className="chat-header-top">
              <div className="chat-icons">
                <button className="icon-pill" aria-label="Chats">💬</button>
                <button className="icon-pill" aria-label="Voice">🎙️</button>
                <button className="icon-pill" aria-label="Media">📎</button>
              </div>
              <button className="history-button chat-history-btn" onClick={openHistory}>
                History
              </button>
            </div>
            <div className="chat-title-row">
              <p className="chat-title">{activeSession?.title || 'Simple chat'}</p>
              <span className="chat-subtitle">{activeSession ? formatDate(activeSession.createdAt) : 'Fast responses, long conversations, rich media support.'}</span>
            </div>
          </div>

          <div className="messages-panel">
            {(messages.length === 0 && !assistantDraft && !assistantThinking) ? (
              <div className="empty-state">Say hi and start a quick conversation.</div>
            ) : (
              [...messages, ...(assistantDraft ? [assistantDraft] : [])].map((message) => (
                <div key={message.id} className={`message-row ${message.role}`}>
                  <div className={`message-bubble ${message.role === 'assistant' ? 'assistant-bubble' : 'user-bubble'}`}>
                    {message.role === 'assistant' && <div className="assistant-badge">typescript</div>}
                    <div className="message-role">{message.role === 'user' ? 'You' : 'AI'}</div>
                    <div className={`message-content ${message.isDraft ? 'draft-content' : ''}`}>
                      {renderMessageContent(message.content)}
                      {message.isDraft && message.content && <span className="typing-caret">▍</span>}
                    </div>
                    {message.photoPreview && <img className="message-image" src={message.photoPreview} alt="Attached content" />}
                  </div>
                </div>
              ))
            )}
            {assistantThinking && (
              <div className="message-row assistant typing-row">
                <div className="message-bubble assistant-bubble typing-bubble">
                  <div className="assistant-badge">typing</div>
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {errorMessage && <div className="error-banner">{errorMessage}</div>}

          <div className="composer">
            <button
              className={`attach-button ${showPhotoOptions ? 'active' : ''}`}
              onClick={() => setShowPhotoOptions((prev) => !prev)}
              disabled={isLoading}
              aria-label="Add media"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
              </svg>
            </button>
            <div className="composer-input-wrap">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                disabled={isLoading}
              />
              <button className="send-button" onClick={sendMessage} disabled={isLoading || (!input.trim() && !photoPreview)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            {showPhotoOptions && (
              <div className="photo-menu">
                <button className="photo-menu-item icon-only" onClick={() => { openCamera(); setShowPhotoOptions(false); }} disabled={isLoading} title="Take Photo">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                <button className="photo-menu-item icon-only" onClick={() => { openUpload(); setShowPhotoOptions(false); }} disabled={isLoading} title="Upload Image">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
              </div>
            )}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} hidden />
            <input ref={uploadInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />
          </div>
          {photoPreview && (
            <div className="photo-preview">
              <img src={photoPreview} alt="Selected" />
              <button className="clear-photo" onClick={() => { setPhotoPreview(null); setPhotoData(null); }}>
                Remove
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
