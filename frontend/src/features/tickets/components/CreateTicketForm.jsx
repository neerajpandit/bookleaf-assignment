import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button.jsx';
import FormField from '../../../components/ui/FormField.jsx';
import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';
import LoadingIndicator from '../../../components/feedback/LoadingIndicator.jsx';
import ErrorState from '../../../components/feedback/ErrorState.jsx';
import { TICKET_CONTEXTS } from '../../../lib/constants/ticketContext.js';
import { formatFileSize } from '../../../lib/formatFileSize.js';
import { validateCreateTicket } from '../validation/ticketValidation.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import { useAllBooks } from '../../books/hooks/useBooks.js';

const ACCEPTED_ATTACHMENT_TYPES = '.pdf,.png,.jpg,.jpeg,.gif,.txt';

export function CreateTicketForm({ onSubmit, isSubmitting }) {
  const fileInputRef = useRef(null);
  const [categoryContext, setCategoryContext] = useState(TICKET_CONTEXTS.BOOK_SPECIFIC);
  const [bookId, setBookId] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);

  const booksQuery = useAllBooks();

  const isGeneralAccount = categoryContext === TICKET_CONTEXTS.GENERAL_ACCOUNT;

  const handleContextChange = (value) => {
    setCategoryContext(value);
    if (value === TICKET_CONTEXTS.GENERAL_ACCOUNT) {
      setBookId('');
    }
  };

  const applyServerValidation = (details) => {
    if (!Array.isArray(details)) {
      return;
    }

    const nextErrors = {};
    details.forEach(({ field, message }) => {
      nextErrors[field] = message;
    });
    setFieldErrors(nextErrors);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    setFieldErrors((current) => ({ ...current, attachment: undefined }));
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setCreatedTicket(null);

    const validation = validateCreateTicket({
      categoryContext,
      bookId: isGeneralAccount ? undefined : bookId,
      subject,
      description,
    });

    setFieldErrors(validation.errors);

    if (!validation.isValid || isSubmitting) {
      return;
    }

    const payload = {
      subject: subject.trim(),
      description: description.trim(),
      categoryContext,
    };

    if (!isGeneralAccount) {
      payload.bookId = bookId;
    }

    try {
      const result = await onSubmit({
        ...payload,
        attachmentFile: selectedFile,
      });
      setCreatedTicket(result.ticket);
      setSubject('');
      setDescription('');
      setBookId('');
      handleRemoveFile();
    } catch (error) {
      const normalized = error.normalized || normalizeApiError(error);
      if (normalized.isValidationError) {
        applyServerValidation(normalized.details);
      }
      setSubmitError(normalized.message);
    }
  };

  if (booksQuery.isLoading) {
    return <LoadingIndicator label="Loading your books…" />;
  }

  if (booksQuery.isError) {
    const normalized = booksQuery.error?.normalized || normalizeApiError(booksQuery.error);
    return (
      <ErrorState
        title="Unable to load books"
        message={normalized.message}
        onRetry={() => booksQuery.refetch()}
      />
    );
  }

  if (createdTicket) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-semibold text-emerald-900">Ticket created</h2>
        <p className="mt-2 text-sm text-emerald-800">
          Your ticket <strong>{createdTicket.ticketNumber}</strong> has been submitted.
        </p>
        {createdTicket.attachment ? (
          <p className="mt-2 text-sm text-emerald-800">
            Attachment uploaded: {createdTicket.attachment.originalFilename}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to={`/author/tickets/${createdTicket.id}`}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            View ticket
          </Link>
          <Link
            to="/author/tickets"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to My Tickets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={handleSubmit}
      noValidate
    >
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-slate-700">Ticket context</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="categoryContext"
            value={TICKET_CONTEXTS.BOOK_SPECIFIC}
            checked={categoryContext === TICKET_CONTEXTS.BOOK_SPECIFIC}
            onChange={() => handleContextChange(TICKET_CONTEXTS.BOOK_SPECIFIC)}
            disabled={isSubmitting}
          />
          Book-specific
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="categoryContext"
            value={TICKET_CONTEXTS.GENERAL_ACCOUNT}
            checked={isGeneralAccount}
            onChange={() => handleContextChange(TICKET_CONTEXTS.GENERAL_ACCOUNT)}
            disabled={isSubmitting}
          />
          General / Account Level
        </label>
      </fieldset>

      <FormField id="ticket-book" label="Book" error={fieldErrors.bookId}>
        <Select
          id="ticket-book"
          value={bookId}
          onChange={(event) => setBookId(event.target.value)}
          disabled={isSubmitting || isGeneralAccount}
          hasError={Boolean(fieldErrors.bookId)}
        >
          <option value="">
            {isGeneralAccount ? 'Not applicable for account-level tickets' : 'Select a book'}
          </option>
          {!isGeneralAccount &&
            (booksQuery.data ?? []).map((book) => (
              <option key={book.bookId} value={book.bookId}>
                {book.title} ({book.bookId})
              </option>
            ))}
        </Select>
      </FormField>

      <FormField id="ticket-subject" label="Subject" error={fieldErrors.subject}>
        <Input
          id="ticket-subject"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          disabled={isSubmitting}
          hasError={Boolean(fieldErrors.subject)}
          maxLength={200}
          required
        />
      </FormField>

      <FormField id="ticket-description" label="Description" error={fieldErrors.description}>
        <Textarea
          id="ticket-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSubmitting}
          hasError={Boolean(fieldErrors.description)}
          rows={6}
          required
        />
      </FormField>

      <FormField id="ticket-attachment" label="Attachment (optional)" error={fieldErrors.attachment}>
        <p className="mb-2 text-xs text-slate-500">PDF, PNG, JPG, GIF, or TXT up to 5 MB.</p>
        <input
          ref={fileInputRef}
          id="ticket-attachment"
          type="file"
          accept={ACCEPTED_ATTACHMENT_TYPES}
          onChange={handleFileChange}
          disabled={isSubmitting}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
        />
        {selectedFile ? (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div>
              <p className="font-medium text-slate-800">{selectedFile.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
            </div>
            <Button type="button" variant="ghost" onClick={handleRemoveFile} disabled={isSubmitting}>
              Remove
            </Button>
          </div>
        ) : null}
      </FormField>

      {submitError ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
          Submit ticket
        </Button>
        <Link
          to="/author/tickets"
          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

export default CreateTicketForm;
