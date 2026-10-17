import { useLocation } from 'react-router-dom';
import PageHeader from '../../../components/layout/PageHeader.jsx';
import BackButton from '../../../components/common/BackButton.jsx';
import CreateTicketForm from '../components/CreateTicketForm.jsx';
import { useCreateTicket } from '../hooks/useTickets.js';
import {
  resolveAuthorCreateTicketBackLabel,
  resolveAuthorCreateTicketBackPath,
} from '../../../lib/ticketNavigation.js';

export function CreateTicketPage() {
  const location = useLocation();
  const createTicketMutation = useCreateTicket();
  const backTo = resolveAuthorCreateTicketBackPath(location.state);
  const backLabel = resolveAuthorCreateTicketBackLabel(location.state);

  return (
    <>
      <div className="mb-4">
        <BackButton to={backTo} label={backLabel} />
      </div>
      <PageHeader
        title="Create support ticket"
        description="Describe your issue and our support team will respond in the ticket conversation."
      />
      <CreateTicketForm
        onSubmit={(payload) => createTicketMutation.mutateAsync(payload)}
        isSubmitting={createTicketMutation.isPending}
      />
    </>
  );
}

export default CreateTicketPage;
