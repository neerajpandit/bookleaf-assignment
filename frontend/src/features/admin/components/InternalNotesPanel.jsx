import { useRef, useState } from 'react';
import Pagination from '../../../components/common/Pagination.jsx';
import Button from '../../../components/ui/Button.jsx';
import FormField from '../../../components/ui/FormField.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import { formatDateTime } from '../../../lib/format.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import { shouldShowListPagination } from '../../../lib/pagination.js';

function NoteItem({ note }) {
  return (
    <article className="rounded-lg border border-violet-200 bg-violet-50 p-3">
      <header className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="font-medium text-violet-900">
          {note.admin?.name || note.admin?.email || 'Admin'}
        </span>
        <time className="text-violet-700" dateTime={note.createdAt}>
          {formatDateTime(note.createdAt)}
        </time>
      </header>
      <p className="whitespace-pre-wrap text-sm text-violet-900">{note.body}</p>
    </article>
  );
}

export function InternalNotesPanel({ notesQuery, onCreateNote, isCreating, onPageChange, onLimitChange }) {
  const [body, setBody] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const submitLockRef = useRef(false);
  const isBusy = isCreating || submitLockRef.current;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isCreating || submitLockRef.current) {
      return;
    }

    setSubmitError('');

    const trimmed = body.trim();
    if (!trimmed) {
      setFieldError('Note is required');
      return;
    }

    setFieldError('');
    submitLockRef.current = true;

    try {
      await onCreateNote(trimmed);
      setBody('');
    } catch (error) {
      setSubmitError((error.normalized || normalizeApiError(error)).message);
    } finally {
      submitLockRef.current = false;
    }
  };

  return (
    <section
      aria-label="Private internal notes"
      className="rounded-lg border-2 border-violet-300 bg-violet-50/30 p-4"
    >
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-violet-900">Private internal notes</h2>
        <p className="text-xs text-violet-700">
          Not visible to authors. These are never sent as public replies.
        </p>
      </div>

      {notesQuery.isLoading ? (
        <LoadingIndicator label="Loading internal notes…" />
      ) : notesQuery.isError ? (
        <ErrorState
          title="Unable to load notes"
          message={(notesQuery.error?.normalized || normalizeApiError(notesQuery.error)).message}
          onRetry={() => notesQuery.refetch()}
        />
      ) : (
        <div className="space-y-3">
          {notesQuery.data?.items?.length ? (
            notesQuery.data.items.map((note) => <NoteItem key={note.id} note={note} />)
          ) : (
            <p className="text-sm text-violet-800">No internal notes yet.</p>
          )}
          {shouldShowListPagination(notesQuery.data?.pagination) ? (
            <Pagination
              page={notesQuery.data.pagination.page}
              totalPages={notesQuery.data.pagination.totalPages}
              total={notesQuery.data.pagination.total}
              limit={notesQuery.data.pagination.limit}
              onPageChange={onPageChange}
              onLimitChange={onLimitChange}
              disabled={notesQuery.isFetching}
              itemLabel="notes"
            />
          ) : null}
        </div>
      )}

      <form className="mt-4 rounded-lg border border-violet-200 bg-white p-3" onSubmit={handleSubmit}>
        <FormField id="internal-note" label="Add private note" error={fieldError}>
          <Textarea
            id="internal-note"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            disabled={isBusy}
            hasError={Boolean(fieldError)}
            placeholder="Team-only context or handoff notes"
          />
        </FormField>
        {submitError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}
        <div className="mt-2">
          <Button type="submit" variant="secondary" isLoading={isCreating} disabled={isBusy}>
            Save private note
          </Button>
        </div>
      </form>
    </section>
  );
}

export default InternalNotesPanel;
