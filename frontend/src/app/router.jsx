import { createBrowserRouter, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout.jsx';
import AuthorLayout from '../layouts/AuthorLayout.jsx';
import AdminLayout from '../layouts/AdminLayout.jsx';
import ProtectedRoute from '../routes/ProtectedRoute.jsx';
import RoleRoute from '../routes/RoleRoute.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/pages/DashboardPage.jsx';
import BooksPage from '../features/books/pages/BooksPage.jsx';
import TicketsPage from '../features/tickets/pages/TicketsPage.jsx';
import CreateTicketPage from '../features/tickets/pages/CreateTicketPage.jsx';
import TicketDetailPage from '../features/tickets/pages/TicketDetailPage.jsx';
import AuthorAccountPage from '../features/author/pages/AuthorAccountPage.jsx';
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage.jsx';
import AdminTicketQueuePage from '../features/admin/pages/AdminTicketQueuePage.jsx';
import AdminTicketDetailPage from '../features/admin/pages/AdminTicketDetailPage.jsx';
import AdminAccountPage from '../features/admin/pages/AdminAccountPage.jsx';
import AdminAuthorsPage from '../features/admin/pages/AdminAuthorsPage.jsx';
import AdminAuthorDetailPage from '../features/admin/pages/AdminAuthorDetailPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import { ROLES } from '../features/auth/constants.js';

/**
 * Route namespaces:
 * - Author: /author, /author/books, /author/tickets, ...
 * - Admin: /admin, /admin/tickets, /admin/tickets/:ticketId, /admin/authors, /admin/authors/:authorUserId
 */
export const appRoutes = [
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/author',
        element: (
          <RoleRoute allowedRoles={[ROLES.AUTHOR]}>
            <AuthorLayout />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'books', element: <BooksPage /> },
          { path: 'tickets', element: <TicketsPage /> },
          { path: 'tickets/new', element: <CreateTicketPage /> },
          { path: 'tickets/:ticketId', element: <TicketDetailPage /> },
          { path: 'account', element: <AuthorAccountPage /> },
        ],
      },
      {
        path: '/admin',
        element: (
          <RoleRoute allowedRoles={[ROLES.ADMIN]}>
            <AdminLayout />
          </RoleRoute>
        ),
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'tickets', element: <AdminTicketQueuePage /> },
          { path: 'tickets/:ticketId', element: <AdminTicketDetailPage /> },
          { path: 'authors', element: <AdminAuthorsPage /> },
          { path: 'authors/:authorUserId', element: <AdminAuthorDetailPage /> },
          { path: 'account', element: <AdminAccountPage /> },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
];

export const router = createBrowserRouter(appRoutes);

export default router;
