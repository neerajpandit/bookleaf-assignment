import { getKnowledgeBaseTitle } from '../../../lib/constants/knowledgeBase.js';

export function AiKnowledgeBaseReferences({ referenceIds = [] }) {
  if (!referenceIds.length) {
    return (
      <p className="text-sm text-slate-600">
        No knowledge-base references were returned for this analysis.
      </p>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Knowledge base references">
      {referenceIds.map((referenceId) => {
        const title = getKnowledgeBaseTitle(referenceId);

        return (
          <li
            key={referenceId}
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            <p className="font-medium text-slate-800">{title || 'Unknown reference'}</p>
            <p className="text-xs text-slate-500">ID: {referenceId}</p>
            {!title ? (
              <p className="mt-1 text-xs text-amber-700">
                This identifier was returned by the backend but is not in the known title map.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Policy excerpts are not exposed via the API. Use the identifier to locate the
                source document in the backend knowledge base.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default AiKnowledgeBaseReferences;
