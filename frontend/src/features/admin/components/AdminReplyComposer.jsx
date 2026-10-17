import { useRef, useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import FormField from '../../../components/ui/FormField.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import { TICKET_STATUSES } from '../../../lib/constants/ticketStatus.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import { useComposerKeyboard } from '../../tickets/hooks/useComposerKeyboard.js';

export function AdminReplyComposer({ ticketStatus, onSubmit, isSubmitting, initialBody = '' }) {
  const [body, setBody] = useState(initialBody);
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

    const trimmed = body.trim();
    if (!trimmed) {
      setFieldError('Reply is required');
      return;
    }

    if (trimmed.length > 10000) {
      setFieldError('Reply must be 10,000 characters or less');
      return;
    }

    setFieldError('');
    submitLockRef.current = true;

    try {
      await onSubmit(trimmed);
      setBody('');
      setSuccessMessage('Public reply sent to the author.');
    } catch (error) {
      setSubmitError((error.normalized || normalizeApiError(error)).message);
    } finally {
      submitLockRef.current = false;
    }
  };

  const handleComposerKeyDown = useComposerKeyboard(handleSubmit);

  if (isClosed) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        This ticket is closed. Public replies are no longer accepted.
      </div>
    );
  }

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleSubmit}>
      <FormField id="admin-public-reply" label="Public reply to author" error={fieldError}>
        <Textarea
          id="admin-public-reply"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleComposerKeyDown}
          rows={5}
          disabled={isBusy}
          hasError={Boolean(fieldError)}
          placeholder="This message will be visible to the author."
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
          Send public reply
        </Button>
      </div>
    </form>
  );
}

export default AdminReplyComposer;
