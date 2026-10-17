import { useEffect, useRef, useState } from 'react';
import api, { errorMessage } from '../api';

const greeting = {
  role: 'model',
  text: 'Hi! I can help you explore YatraHub and plan a trip around India. What would you like to know?'
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([greeting]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const transcriptRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      transcriptRef.current?.scrollTo({
        top: transcriptRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, open, busy, error]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = async event => {
    event.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const nextMessages = [...messages, { role: 'user', text }];
    const conversation = nextMessages
      .filter(message => message !== greeting)
      .slice(-12);
    setMessages(nextMessages);
    setInput('');
    setBusy(true);
    setError('');

    try {
      const response = await api.post('/chatbot', { messages: conversation });
      setMessages([
        ...nextMessages,
        { role: 'model', text: response.data.data.reply }
      ]);
    } catch (err) {
      setError(errorMessage(err));
      setMessages(messages);
      setInput(text);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="chatbot">
      {open && (
        <section className="chatbot__panel" aria-label="YatraHub travel assistant">
          <header className="chatbot__header">
            <div>
              <h2>YatraHub Assistant</h2>
              <p>Travel ideas and website help</p>
            </div>
            <button
              className="chatbot__close"
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="chatbot__messages" ref={transcriptRef} aria-live="polite">
            {messages.map((message, index) => (
              <p
                className={`chatbot__message chatbot__message--${message.role}`}
                key={`${index}-${message.role}`}
              >
                {message.text}
              </p>
            ))}
            {busy && <p className="chatbot__typing">Thinking...</p>}
            {error && <p className="chatbot__error" role="alert">{error}</p>}
          </div>

          <form className="chatbot__form" onSubmit={sendMessage}>
            <label className="chatbot__sr-only" htmlFor="chatbot-message">
              Message the travel assistant
            </label>
            <textarea
              id="chatbot-message"
              ref={inputRef}
              value={input}
              onChange={event => setInput(event.target.value)}
              placeholder="Ask about your next trip..."
              maxLength={2000}
              rows={2}
              disabled={busy}
            />
            <button
              className="chatbot__send"
              type="submit"
              disabled={busy || !input.trim()}
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        className="chatbot__toggle"
        type="button"
        aria-expanded={open}
        aria-label={open ? 'Close travel assistant' : 'Open travel assistant'}
        onClick={() => setOpen(value => !value)}
      >
        <span className="chatbot__toggle-icon" aria-hidden="true">
          {open ? (
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l1.7-3.4A7.5 7.5 0 1 1 20 11.5Z" />
              <path d="M8.5 11.5h.01M12.5 11.5h.01M16.5 11.5h.01" />
            </svg>
          )}
        </span>
        <span className="chatbot__toggle-copy">
          <strong>{open ? 'Close chat' : 'Ask YatraHub'}</strong>
          {!open && <small>Travel assistant</small>}
        </span>
        {!open && <span className="chatbot__status" aria-hidden="true" />}
      </button>
    </div>
  );
}
