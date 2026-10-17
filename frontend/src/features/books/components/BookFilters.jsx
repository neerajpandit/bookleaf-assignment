import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';
import { BOOK_STATUS_VALUES } from '../../../lib/constants/bookStatus.js';

export function BookFilters({ search, status, onSearchChange, onStatusChange, onSubmit, isLoading }) {
  return (
    <form
      className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="flex-1">
        <label htmlFor="book-search" className="mb-1 block text-sm font-medium text-slate-700">
          Search by title
        </label>
        <Input
          id="book-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search book titles"
          disabled={isLoading}
        />
      </div>
      <div className="sm:w-56">
        <label htmlFor="book-status" className="mb-1 block text-sm font-medium text-slate-700">
          Status
        </label>
        <Select
          id="book-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value)}
          disabled={isLoading}
        >
          <option value="">All statuses</option>
          {BOOK_STATUS_VALUES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" variant="secondary" disabled={isLoading}>
        Apply
      </Button>
    </form>
  );
}

export default BookFilters;
