export function buildTicketDetailState({ listSearch, queueSearch, origin, authorId } = {}) {
  const state = {};

  if (listSearch != null) {
    state.listSearch = listSearch;
  }

  if (queueSearch != null) {
    state.queueSearch = queueSearch;
  }

  if (origin) {
    state.ticketOrigin = origin;
  }

  if (authorId) {
    state.authorId = authorId;
  }

  return Object.keys(state).length ? state : undefined;
}

export function resolveAuthorTicketBackPath(locationState) {
  if (locationState?.ticketOrigin === 'dashboard') {
    return '/author';
  }

  const search = locationState?.listSearch ?? '';
  return `/author/tickets${search}`;
}

export function resolveAuthorTicketBackLabel(locationState) {
  if (locationState?.ticketOrigin === 'dashboard') {
    return 'Back to dashboard';
  }

  return 'Back to tickets';
}

export function resolveAdminTicketBackPath(locationState) {
  if (locationState?.queueSearch != null) {
    return `/admin/tickets${locationState.queueSearch}`;
  }

  if (locationState?.ticketOrigin === 'dashboard') {
    return '/admin';
  }

  if (locationState?.ticketOrigin === 'author-profile' && locationState?.authorId) {
    return `/admin/authors/${locationState.authorId}`;
  }

  return '/admin/tickets';
}

export function resolveAdminTicketBackLabel(locationState) {
  if (locationState?.ticketOrigin === 'author-profile') {
    return 'Back to author profile';
  }

  if (locationState?.ticketOrigin === 'dashboard') {
    return 'Back to admin dashboard';
  }

  return 'Back to ticket queue';
}

export function resolveAuthorCreateTicketBackPath(locationState) {
  if (locationState?.ticketOrigin === 'dashboard') {
    return '/author';
  }

  const search = locationState?.listSearch ?? '';
  return `/author/tickets${search}`;
}

export function resolveAuthorCreateTicketBackLabel(locationState) {
  if (locationState?.ticketOrigin === 'dashboard') {
    return 'Back to author dashboard';
  }

  return 'Back to my tickets';
}

export function resolveAdminAuthorDetailBackPath(locationState) {
  if (locationState?.returnTo) {
    return locationState.returnTo;
  }

  if (locationState?.listSearch != null) {
    return `/admin/authors${locationState.listSearch}`;
  }

  return '/admin/authors';
}

export function resolveAdminAuthorDetailBackLabel(locationState) {
  if (locationState?.returnTo) {
    return 'Back to previous page';
  }

  return 'Back to all authors';
}

export default {
  buildTicketDetailState,
  resolveAuthorTicketBackPath,
  resolveAuthorTicketBackLabel,
  resolveAuthorCreateTicketBackPath,
  resolveAuthorCreateTicketBackLabel,
  resolveAdminTicketBackPath,
  resolveAdminTicketBackLabel,
  resolveAdminAuthorDetailBackPath,
  resolveAdminAuthorDetailBackLabel,
};
