import Button from '../../../components/ui/Button.jsx';
import Textarea from '../../../components/ui/Textarea.jsx';

export function AiDraftEditor({
  draftText,
  onDraftChange,
  onReset,
  onApprove,
  onLoadNewDraft,
  hasPendingNewDraft,
  isRegenerating,
  isSendingDraft,
  placeholder,
  approveError,
  sendSuccess,
}) {
  return (
    <div className="mt-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="ai-draft-editor" className="text-sm font-medium text-slate-700">
          AI-generated draft (requires review before sending)
        </label>
        {hasPendingNewDraft ? (
          <Button variant="secondary" onClick={onLoadNewDraft} disabled={isRegenerating}>
            Load new AI draft
          </Button>
        ) : null}
      </div>

      {hasPendingNewDraft ? (
        <p className="mb-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800" role="status">
          A new AI draft is available. Your unsaved edits were preserved. Load the new draft
          explicitly if you want to replace your text.
        </p>
      ) : null}

      <Textarea
        id="ai-draft-editor"
        value={draftText}
        onChange={(event) => onDraftChange(event.target.value)}
        rows={6}
        disabled={isRegenerating || isSendingDraft}
        placeholder={placeholder}
        aria-describedby="ai-draft-help"
      />
      <p id="ai-draft-help" className="mt-1 text-xs text-slate-500">
        Edits stay local until you send the approved draft as a public reply.
      </p>

      {approveError ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {approveError}
        </p>
      ) : null}
      {sendSuccess ? (
        <p className="mt-2 text-sm text-emerald-700" role="status">
          {sendSuccess}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="ghost"
          onClick={onReset}
          disabled={isRegenerating || isSendingDraft}
        >
          Reset draft
        </Button>
        <Button
          onClick={onApprove}
          isLoading={isSendingDraft}
          disabled={isSendingDraft || isRegenerating}
        >
          Send approved draft as public reply
        </Button>
      </div>
    </div>
  );
}

export default AiDraftEditor;
