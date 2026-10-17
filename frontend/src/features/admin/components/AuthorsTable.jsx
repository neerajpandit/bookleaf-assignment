import { Link } from 'react-router-dom';
import { formatDate } from '../../../lib/format.js';

export function AuthorsTable({ authors, listSearch = '' }) {
  const navigationState = listSearch ? { listSearch } : undefined;
  if (!authors.length) {
    return null;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Author
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Author ID
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Contact
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                City
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Joined
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                Books
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                Open tickets
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                Pending
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {authors.map((author) => (
              <tr key={author.authorUserId} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{author.name || '—'}</div>
                  <div className="text-xs text-slate-500">{author.email}</div>
                </td>
                <td className="px-4 py-3 text-slate-700">{author.authorId}</td>
                <td className="px-4 py-3 text-slate-700">{author.phone || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{author.city || '—'}</td>
                <td className="px-4 py-3 text-slate-700">{formatDate(author.joinedDate)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{author.bookCount ?? 0}</td>
                <td className="px-4 py-3 text-right text-slate-700">{author.openTicketCount ?? 0}</td>
                <td className="px-4 py-3 text-right text-slate-700">{author.pendingTicketCount ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/admin/authors/${author.authorUserId}`}
                    state={navigationState}
                    className="font-medium text-emerald-800 hover:underline"
                  >
                    View details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {authors.map((author) => (
          <article
            key={author.authorUserId}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <h3 className="font-semibold text-slate-900">{author.name || author.email}</h3>
            <p className="text-xs text-slate-500">{author.authorId}</p>
            <p className="mt-2 text-sm text-slate-600">
              {author.bookCount ?? 0} books · {author.openTicketCount ?? 0} open tickets
            </p>
            <Link
              to={`/admin/authors/${author.authorUserId}`}
              state={navigationState}
              className="mt-3 inline-block text-sm font-medium text-emerald-800 hover:underline"
            >
              View details
            </Link>
          </article>
        ))}
      </div>
    </>
  );
}

export default AuthorsTable;
