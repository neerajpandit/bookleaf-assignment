import { useEffect, useState } from 'react';
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import { getAllowedNextStatuses } from '../../../lib/constants/statusTransitions.js';
import { TICKET_CATEGORY_VALUES } from '../../../lib/constants/ticketCategory.js';
import { TICKET_PRIORITY_VALUES } from '../../../lib/constants/ticketPriority.js';
import { TICKET_STATUSES } from '../../../lib/constants/ticketStatus.js';
import { SUGGESTION_SOURCE_LABELS } from '../../../lib/constants/suggestionSource.js';
import { normalizeApiError } from '../../../lib/apiError.js';
import { PriorityBadge } from '../../../components/common/StatusBadge.jsx';
import { formatDateTime } from '../../../lib/format.js';

export function AssignmentControl({ ticket, assigneeOptions, onAssign, isPending }) {
  const [selected, setSelected] = useState(ticket.assignedAdmin?.id || '');

  const handleAssign = async () => {
    const assignedTo = selected === '' ? null : selected;
    await onAssign(assignedTo);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Assignment</h3>
      <p className="mt-1 text-xs text-slate-500">
        Assignee list is limited to admins seen in the queue and your account. No full admin directory
        API is available.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="assignee-select" className="mb-1 block text-sm text-slate-700">
            Assign to
          </label>
          <Select
            id="assignee-select"
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            disabled={isPending}
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name || assignee.email}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={handleAssign} isLoading={isPending} disabled={isPending}>
          Update assignment
        </Button>
      </div>
    </div>
  );
}

export function StatusControl({ ticket, onStatusChange, isPending }) {
  const [nextStatus, setNextStatus] = useState('');
  const [error, setError] = useState('');
  const allowed = getAllowedNextStatuses(ticket.status);

  const handleSubmit = async () => {
    setError('');
    if (!nextStatus) return;
    try {
      await onStatusChange(nextStatus);
      setNextStatus('');
    } catch (err) {
      setError((err.normalized || normalizeApiError(err)).message);
    }
  };

  if (ticket.status === TICKET_STATUSES.CLOSED) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        This ticket is closed and cannot change status.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Status</h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="status-select" className="mb-1 block text-sm text-slate-700">
            Change to
          </label>
          <Select
            id="status-select"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value)}
            disabled={isPending}
          >
            <option value="">Select status</option>
            {allowed.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={handleSubmit} isLoading={isPending} disabled={isPending || !nextStatus}>
          Update status
        </Button>
      </div>
      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function ClassificationControl({ ticket, onClassificationChange, isPending }) {
  const [category, setCategory] = useState(ticket.category || '');
  const [priority, setPriority] = useState(ticket.priority || '');
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const suggestedPriority = ticket.suggestedPriority ?? ticket.aiPriority;
  const suggestedCategory = ticket.suggestedCategory ?? ticket.aiCategory;
  const suggestionReason = ticket.suggestionReason ?? ticket.aiPriorityRationale;
  const suggestionSourceLabel =
    SUGGESTION_SOURCE_LABELS[ticket.suggestionSource || ticket.aiProvider] || 'Policy rules';

  useEffect(() => {
    setCategory(ticket.category || '');
    setPriority(ticket.priority || '');
  }, [ticket.category, ticket.priority, ticket.priorityOverride]);

  const handleSubmit = async () => {
    setError('');
    setSuccessMessage('');
    const payload = {};
    if (category && category !== ticket.category) payload.category = category;
    if (priority && priority !== ticket.priority) {
      payload.priority = priority;
      if (overrideReason.trim()) {
        payload.priorityOverrideReason = overrideReason.trim();
      }
    }

    if (!payload.category && !payload.priority) {
      setError('Select a category or priority to update.');
      return;
    }

    try {
      await onClassificationChange(payload);
      setSuccessMessage('Classification updated.');
      setOverrideReason('');
    } catch (err) {
      setError((err.normalized || normalizeApiError(err)).message);
    }
  };

  const handleClearOverride = async () => {
    setError('');
    setSuccessMessage('');
    try {
      await onClassificationChange({ clearPriorityOverride: true });
      setPriority(ticket.suggestedPriority ?? ticket.aiPriority ?? '');
      setSuccessMessage('Priority override cleared.');
    } catch (err) {
      setError((err.normalized || normalizeApiError(err)).message);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-900">Classification and priority</h3>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Effective priority</p>
          <div className="mt-2">
            <PriorityBadge priority={ticket.priority} />
            {ticket.priorityOverride ? (
              <p className="mt-2 text-xs font-medium text-amber-700">Manually overridden</p>
            ) : null}
          </div>
        </div>
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Suggested priority</p>
          <div className="mt-2">
            <PriorityBadge priority={suggestedPriority} />
            <p className="mt-2 text-xs text-slate-600">Source: {suggestionSourceLabel}</p>
          </div>
        </div>
      </div>

      {(suggestedCategory || suggestionReason) && (
        <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          {suggestedCategory ? <p>Suggested category: {suggestedCategory}</p> : null}
          {suggestionReason ? <p className="mt-1 text-xs text-slate-600">{suggestionReason}</p> : null}
        </div>
      )}

      {ticket.priorityOverride ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <p>
            Overridden by {ticket.priorityOverriddenBy?.name || ticket.priorityOverriddenBy?.email || 'admin'}
            {ticket.priorityOverriddenAt ? ` on ${formatDateTime(ticket.priorityOverriddenAt)}` : ''}
          </p>
          {ticket.priorityOverrideReason ? <p className="mt-1">Reason: {ticket.priorityOverrideReason}</p> : null}
        </div>
      ) : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="category-override" className="mb-1 block text-sm text-slate-700">
            Category
          </label>
          <Select
            id="category-override"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={isPending}
          >
            <option value="">Select category</option>
            {TICKET_CATEGORY_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="priority-override" className="mb-1 block text-sm text-slate-700">
            Effective priority
          </label>
          <Select
            id="priority-override"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            disabled={isPending}
          >
            <option value="">Select priority</option>
            {TICKET_PRIORITY_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="priority-override-reason" className="mb-1 block text-sm text-slate-700">
          Override reason (optional)
        </label>
        <Input
          id="priority-override-reason"
          value={overrideReason}
          onChange={(event) => setOverrideReason(event.target.value)}
          disabled={isPending}
          placeholder="Why is the effective priority being changed?"
        />
      </div>

      {error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {successMessage ? (
        <p className="mt-2 text-sm text-emerald-700" role="status">
          {successMessage}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button onClick={handleSubmit} isLoading={isPending} disabled={isPending}>
          Save classification
        </Button>
        {ticket.priorityOverride ? (
          <Button variant="secondary" onClick={handleClearOverride} isLoading={isPending} disabled={isPending}>
            Clear priority override
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default AssignmentControl;
