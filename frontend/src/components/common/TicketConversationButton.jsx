import { Link } from 'react-router-dom';

export function TicketConversationButton({
  to,
  state,
  ticketNumber,
  className = '',
  onNavigate,
}) {
  const label = ticketNumber
    ? `Open conversation for ticket ${ticketNumber}`
    : 'Open conversation';

  return (
    <Link
      to={to}
      state={state}
      aria-label={label}
      title={label}
      onClick={(event) => {
        event.stopPropagation();
        onNavigate?.(event);
      }}
      className={`inline-flex shrink-0 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${className}`}
    >
      Chat
    </Link>
  );
}

export default TicketConversationButton;
