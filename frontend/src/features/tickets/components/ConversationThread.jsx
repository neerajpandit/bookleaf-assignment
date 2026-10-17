import { useEffect, useRef } from 'react';
import { formatDateTime } from '../../../lib/format.js';

function MessageBubble({ message }) {
  const isAuthor = message.senderRole === 'AUTHOR';
  const senderLabel = message.senderName || message.senderRole;
  const roleHint = isAuthor ? 'Author message' : 'Support reply';

  return (
    <article
      className={`rounded-lg border p-4 ${
        isAuthor ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
      }`}
      aria-label={`${roleHint} from ${senderLabel}`}
    >
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-800">{senderLabel}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
              isAuthor ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {isAuthor ? 'Author' : 'Support'}
          </span>
        </div>
        <time className="text-slate-500" dateTime={message.createdAt}>
          {formatDateTime(message.createdAt)}
        </time>
      </header>
      <p className="whitespace-pre-wrap break-words text-sm text-slate-700">{message.body}</p>
    </article>
  );
}

export function ConversationThread({ messages = [], emptyMessage = 'No messages yet.' }) {
  const scrollContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const previousCountRef = useRef(messages.length);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const bottom = bottomRef.current;

    if (!container || !bottom) {
      return;
    }

    const isInitialLoad = previousCountRef.current === 0 && messages.length > 0;
    const hasNewMessages = messages.length > previousCountRef.current;
    previousCountRef.current = messages.length;

    if (isInitialLoad || hasNewMessages) {
      if (typeof bottom.scrollIntoView === 'function') {
        bottom.scrollIntoView({ block: 'end', behavior: isInitialLoad ? 'auto' : 'smooth' });
      } else if (typeof container.scrollTop !== 'undefined') {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages]);

  return (
    <div
      ref={scrollContainerRef}
      className="max-h-[28rem] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/60 p-4"
      aria-label="Ticket conversation"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {!messages.length ? (
        <p className="text-sm text-slate-600" role="status">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <div ref={bottomRef} aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export default ConversationThread;
