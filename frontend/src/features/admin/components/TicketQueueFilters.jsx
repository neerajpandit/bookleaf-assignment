import Input from '../../../components/ui/Input.jsx';
import Select from '../../../components/ui/Select.jsx';
import Button from '../../../components/ui/Button.jsx';
import { TICKET_STATUS_VALUES } from '../../../lib/constants/ticketStatus.js';
import { TICKET_CATEGORY_VALUES } from '../../../lib/constants/ticketCategory.js';
import { TICKET_PRIORITY_VALUES } from '../../../lib/constants/ticketPriority.js';
import { AI_PROCESSING_STATUS_VALUES } from '../../../lib/constants/aiProcessingStatus.js';
import { AI_STATUS_LABELS } from '../utils/aiAnalysis.js';

export function TicketQueueFilters({
  searchInput,
  onSearchInputChange,
  filters,
  onFilterChange,
  assigneeOptions,
  onClearFilters,
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="queue-search" className="mb-1 block text-sm font-medium text-slate-700">
            Search
          </label>
          <Input
            id="queue-search"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            placeholder="Ticket #, subject, author"
          />
        </div>
        <div>
          <label htmlFor="queue-status" className="mb-1 block text-sm font-medium text-slate-700">
            Status
          </label>
          <Select
            id="queue-status"
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
          <label htmlFor="queue-category" className="mb-1 block text-sm font-medium text-slate-700">
            Category
          </label>
          <Select
            id="queue-category"
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
        <div>
          <label htmlFor="queue-priority" className="mb-1 block text-sm font-medium text-slate-700">
            Priority
          </label>
          <Select
            id="queue-priority"
            value={filters.priority}
            onChange={(event) => onFilterChange({ priority: event.target.value })}
          >
            <option value="">All priorities</option>
            {TICKET_PRIORITY_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="queue-assignee" className="mb-1 block text-sm font-medium text-slate-700">
            Assignee
          </label>
          <Select
            id="queue-assignee"
            value={filters.assignedToMe ? 'me' : filters.assignedTo}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'me') {
                onFilterChange({ assignedToMe: true, assignedTo: '' });
              } else if (value === 'unassigned') {
                onFilterChange({ assignedToMe: false, assignedTo: 'unassigned' });
              } else {
                onFilterChange({ assignedToMe: false, assignedTo: value });
              }
            }}
          >
            <option value="">All assignees</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
            {assigneeOptions.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name || assignee.email}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="queue-ai-status" className="mb-1 block text-sm font-medium text-slate-700">
            AI processing
          </label>
          <Select
            id="queue-ai-status"
            value={filters.aiProcessingStatus}
            onChange={(event) => onFilterChange({ aiProcessingStatus: event.target.value })}
          >
            <option value="">All AI statuses</option>
            {AI_PROCESSING_STATUS_VALUES.map((value) => (
              <option key={value} value={value}>
                {AI_STATUS_LABELS[value] || value.replace(/_/g, ' ')}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="queue-date-from" className="mb-1 block text-sm font-medium text-slate-700">
            Created from
          </label>
          <Input
            id="queue-date-from"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => onFilterChange({ dateFrom: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor="queue-date-to" className="mb-1 block text-sm font-medium text-slate-700">
            Created to
          </label>
          <Input
            id="queue-date-to"
            type="date"
            value={filters.dateTo}
            onChange={(event) => onFilterChange({ dateTo: event.target.value })}
          />
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

export default TicketQueueFilters;
