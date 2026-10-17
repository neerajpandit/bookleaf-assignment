import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';
import { TICKET_STATUS_VALUES } from '../../../lib/constants/ticketStatus.js';
import { TICKET_CATEGORY_VALUES } from '../../../lib/constants/ticketCategory.js';

export function TicketListFilters({ searchInput, filters, onFilterChange, onClearFilters }) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="author-ticket-search" className="mb-1 block text-sm font-medium text-slate-700">
            Search
          </label>
          <Input
            id="author-ticket-search"
            value={searchInput}
            onChange={(event) => onFilterChange({ searchInput: event.target.value })}
            placeholder="Ticket # or subject"
          />
        </div>
        <div>
          <label htmlFor="author-ticket-status" className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <Select
            id="author-ticket-status"
            value={filters.status}
            onChange={(event) => onFilterChange({ status: event.target.value })}
          >
            <option value="">All statuses</option>
            {TICKET_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {value.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="author-ticket-category" className="mb-1 block text-sm font-medium text-slate-700">
            Category
          </label>
          <Select
            id="author-ticket-category"
            value={filters.category}
            onChange={(event) => onFilterChange({ category: event.target.value })}
          >
            <option value="">All categories</option>
            {TICKET_CATEGORY_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex justify-end">
        <Button variant="ghost" onClick={onClearFilters}>
          Clear filters
        </Button>
      </div>
    </div>
  );
}

export default TicketListFilters;
