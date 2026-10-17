import { useState } from 'react';
import Button from '../../../components/ui/Button.jsx';
import { formatDateTime } from '../../../lib/format.js';
import { formatFileSize } from '../../../lib/formatFileSize.js';
import { downloadTicketAttachment } from '../api/ticketsApi.js';
import { normalizeApiError } from '../../../lib/apiError.js';

export function TicketAttachmentPanel({ ticketId, attachment }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  if (!attachment) {
    return null;
  }

  const handleDownload = async () => {
    setError('');
    setIsDownloading(true);

    try {
      const blob = await downloadTicketAttachment(ticketId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalFilename || 'ticket-attachment';
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError((downloadError.normalized || normalizeApiError(downloadError)).message);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <section aria-label="Ticket attachment" className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Attachment</h2>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-slate-800">{attachment.originalFilename}</p>
          <p className="mt-1 text-xs text-slate-500">
            {formatFileSize(attachment.sizeBytes)} · Uploaded {formatDateTime(attachment.uploadedAt)}
          </p>
        </div>
        <Button variant="secondary" onClick={handleDownload} isLoading={isDownloading} disabled={isDownloading}>
          Download
        </Button>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

export default TicketAttachmentPanel;
