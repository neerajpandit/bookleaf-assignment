import { formatDate, formatINR, displayValue } from '../../../lib/format.js';
import { BOOK_STATUSES } from '../../../lib/constants/bookStatus.js';

function BookCard({ book }) {
  const isPublished = book.status === BOOK_STATUSES.PUBLISHED_LIVE;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:hidden">
      <h3 className="font-semibold text-slate-900">{book.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{book.bookId}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-slate-500">ISBN</dt>
          <dd>{displayValue(book.isbn)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Genre</dt>
          <dd>{displayValue(book.genre)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Status</dt>
          <dd>{book.status}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Published</dt>
          <dd>{isPublished ? formatDate(book.publicationDate) : 'In production'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">MRP</dt>
          <dd>{book.mrp != null ? formatINR(book.mrp) : '—'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Copies sold</dt>
          <dd>{book.totalCopiesSold ?? 0}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Earned</dt>
          <dd>{formatINR(book.totalRoyaltyEarned)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Pending</dt>
          <dd>{formatINR(book.royaltyPending)}</dd>
        </div>
      </dl>
    </article>
  );
}

export function BookList({ books }) {
  if (!books.length) {
    return null;
  }

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 bg-white lg:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Title
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                ISBN
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Genre
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Published
              </th>
              <th scope="col" className="px-4 py-3 text-left font-medium text-slate-600">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                MRP
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                Sold
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                Earned
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                Paid
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium text-slate-600">
                Pending
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {books.map((book) => {
              const isPublished = book.status === BOOK_STATUSES.PUBLISHED_LIVE;
              return (
                <tr key={book.bookId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{book.title}</div>
                    <div className="text-xs text-slate-500">{book.bookId}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{displayValue(book.isbn)}</td>
                  <td className="px-4 py-3 text-slate-700">{displayValue(book.genre)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {isPublished ? formatDate(book.publicationDate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{book.status}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {book.mrp != null ? formatINR(book.mrp) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">{book.totalCopiesSold ?? 0}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatINR(book.totalRoyaltyEarned)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatINR(book.royaltyPaid)}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {formatINR(book.royaltyPending)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 lg:hidden">
        {books.map((book) => (
          <BookCard key={book.bookId} book={book} />
        ))}
      </div>
    </>
  );
}

export default BookList;
