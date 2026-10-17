/**
 * Collects assignee options from queue data and the current admin.
 * Backend gap: no GET /admin/users endpoint for a full assignee list.
 */
export function collectAssigneeOptions(tickets, currentAdmin) {
  const map = new Map();

  if (currentAdmin?.id) {
    map.set(currentAdmin.id, {
      id: currentAdmin.id,
      name: currentAdmin.name || currentAdmin.email,
      email: currentAdmin.email,
    });
  }

  (tickets ?? []).forEach((ticket) => {
    const assignee = ticket.assignedAdmin;
    if (assignee?.id && !map.has(assignee.id)) {
      map.set(assignee.id, assignee);
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    (a.name || a.email).localeCompare(b.name || b.email),
  );
}

export default collectAssigneeOptions;
