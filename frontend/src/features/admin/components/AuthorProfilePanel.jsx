import { formatDate, formatDateTime } from '../../../lib/format.js';

export function AuthorProfilePanel({ author }) {
  if (!author) {
    return null;
  }

  return (
    <section aria-label="Author profile" className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-900">Author profile</h2>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Name</dt>
          <dd className="font-medium text-slate-900">{author.name || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Author ID</dt>
          <dd className="font-medium text-slate-900">{author.authorId || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Email</dt>
          <dd className="font-medium text-slate-900">{author.email || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Phone</dt>
          <dd className="text-slate-900">{author.phone || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">City</dt>
          <dd className="text-slate-900">{author.city || '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Joined date</dt>
          <dd className="text-slate-900">{formatDate(author.joinedDate)}</dd>
        </div>
        {author.isActive !== undefined ? (
          <div>
            <dt className="text-slate-500">Account status</dt>
            <dd className="text-slate-900">{author.isActive ? 'Active' : 'Inactive'}</dd>
          </div>
        ) : null}
        {author.createdAt ? (
          <div>
            <dt className="text-slate-500">Account created</dt>
            <dd className="text-slate-900">{formatDateTime(author.createdAt)}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}

export default AuthorProfilePanel;
