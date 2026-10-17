import { useRef, useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import FormField from '../../../components/ui/FormField.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import { validateMessageBody } from '../validation/ticketValidation.js';
import { TICKET_STATUSES } from '../../../lib/constants/ticketStatus.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import { useComposerKeyboard } from '../hooks/useComposerKeyboard.js';

export function MessageComposer({ ticketStatus, onSubmit, isSubmitting }) {
  const [body, setBody] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const submitLockRef = useRef(false);

  const isClosed = ticketStatus === TICKET_STATUSES.CLOSED;
  const isBusy = isSubmitting || submitLockRef.current;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || submitLockRef.current) {
      return;
    }

    setSubmitError('');
    setSuccessMessage('');

    const validation = validateMessageBody(body);
    if (!validation.isValid) {
      setFieldError(validation.error);
      return;
    }

    setFieldError('');
    submitLockRef.current = true;

    try {
      await onSubmit(body.trim());
      setBody('');
      setSuccessMessage('Your message was sent.');
    } catch (error) {
      const normalized = error.normalized || normalizeApiError(error);
      setSubmitError(normalized.message);
    } finally {
      submitLockRef.current = false;
    }
  };

  const handleComposerKeyDown = useComposerKeyboard(handleSubmit);

  if (isClosed) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        This ticket is closed. Follow-up messages are no longer accepted.
      </div>
    );
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
      <FormField id="follow-up-message" label="Send a follow-up message" error={fieldError}>
        <Textarea
          id="follow-up-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          placeholder="Type your message…"
          disabled={isBusy}
          hasError={Boolean(fieldError)}
          rows={4}
        />
      </FormField>
      <p className="mt-1 text-xs text-slate-500">Press Enter to send. Shift+Enter for a new line.</p>

      {submitError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {submitError}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-2 text-sm text-emerald-700" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="mt-3">
        <Button type="submit" isLoading={isSubmitting} disabled={isBusy}>
          Send message
        </Button>
      </div>
    </form>
  );
}

export default MessageComposer;
