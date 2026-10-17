import { PriorityBadge } from '../../../components/common/StatusBadge.jsx';

function ValueRow({ label, value, isPriority = false }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2">
        {isPriority && value ? (
          <PriorityBadge priority={value} />
        ) : (
          <p className="text-sm text-slate-800">{value || '—'}</p>
        )}
      </div>
    </div>
  );
}

export function AiClassificationComparison({ ticket }) {
  const effectiveDiffersFromPolicy =
    ticket.policyPriority && ticket.priority && ticket.policyPriority !== ticket.priority;
  const aiDiffersFromPolicy =
    ticket.aiPriority && ticket.policyPriority && ticket.aiPriority !== ticket.policyPriority;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <ValueRow label="Policy priority" value={ticket.policyPriority} isPriority />
        <ValueRow label="AI suggested priority" value={ticket.aiPriority} isPriority />
        <ValueRow label="Effective priority" value={ticket.priority} isPriority />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <ValueRow label="Policy category" value={ticket.policyCategory} />
        <ValueRow label="AI suggested category" value={ticket.aiCategory} />
        <ValueRow label="Effective category" value={ticket.category} />
      </div>
      {ticket.policyPriorityRationale ? (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">Policy rationale:</span>{' '}
          {ticket.policyPriorityRationale}
        </p>
      ) : null}
      {ticket.aiPriorityRationale ? (
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">AI rationale:</span>{' '}
          {ticket.aiPriorityRationale}
        </p>
      ) : null}
      {effectiveDiffersFromPolicy ? (
        <p className="text-xs text-amber-700" role="note">
          Effective priority differs from the policy assignment, usually because of a manual admin
          override.
        </p>
      ) : null}
      {aiDiffersFromPolicy ? (
        <p className="text-xs text-slate-600" role="note">
          AI suggestion differs from the policy assignment. Effective priority remains policy-based
          unless an admin overrides it.
        </p>
      ) : null}
    </div>
  );
}

export default AiClassificationComparison;
