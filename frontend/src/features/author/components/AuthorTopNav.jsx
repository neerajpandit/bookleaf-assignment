import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../../../components/ui/Button.jsx';
import { IconMenu } from '../../../components/icons/AdminNavIcons.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';

function getPageTitle(pathname) {
  if (pathname === '/author') {
    return 'Overview';
  }

  if (pathname === '/author/books') {
    return 'My Books';
  }

  if (pathname === '/author/tickets') {
    return 'My Tickets';
  }

  if (pathname === '/author/tickets/new') {
    return 'Create ticket';
  }

  if (/^\/author\/tickets\/[^/]+$/.test(pathname)) {
    return 'Ticket detail';
  }

  if (pathname === '/author/account') {
    return 'Account';
  }

  return 'Author workspace';
}

function getBreadcrumbs(pathname) {
  const crumbs = [{ label: 'Author', to: '/author' }];

  if (pathname === '/author/books') {
    crumbs.push({ label: 'My Books', to: '/author/books' });
    return crumbs;
  }

  if (pathname === '/author/tickets') {
    crumbs.push({ label: 'My Tickets', to: '/author/tickets' });
    return crumbs;
  }

  if (pathname === '/author/tickets/new') {
    crumbs.push({ label: 'My Tickets', to: '/author/tickets' });
    crumbs.push({ label: 'Create ticket' });
    return crumbs;
  }

  if (/^\/author\/tickets\/[^/]+$/.test(pathname)) {
    crumbs.push({ label: 'My Tickets', to: '/author/tickets' });
    crumbs.push({ label: 'Ticket detail' });
    return crumbs;
  }

  if (pathname === '/author/account') {
    crumbs.push({ label: 'Account', to: '/author/account' });
    return crumbs;
  }

  if (pathname === '/author') {
    crumbs.push({ label: 'Overview' });
  }

  return crumbs;
}

export function AuthorTopNav({ onOpenMobileSidebar }) {
  const { user, logout, status } = useAuth();
  const location = useLocation();

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  const breadcrumbs = useMemo(() => getBreadcrumbs(location.pathname), [location.pathname]);

  return (
    <header className="z-30 shrink-0 border-b border-slate-200 bg-white">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            className="lg:hidden"
            aria-label="Open navigation menu"
            onClick={onOpenMobileSidebar}
          >
            <IconMenu />
          </Button>
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
              <ol className="flex flex-wrap items-center gap-1">
                {breadcrumbs.map((crumb, index) => (
                  <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                    {index > 0 ? <span aria-hidden="true">/</span> : null}
                    {crumb.to ? (
                      <Link to={crumb.to} className="hover:text-emerald-800 hover:underline">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current="page">{crumb.label}</span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <h1 className="truncate text-lg font-semibold text-slate-900">{pageTitle}</h1>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-medium text-slate-800">
              {user?.name || user?.email || 'Author'}
            </p>
            <p className="text-xs text-slate-500">
              {user?.authorId ? `${user.authorId} · ` : ''}
              {status === 'authenticated' ? 'Signed in' : 'Session unavailable'}
            </p>
          </div>
          <Button variant="ghost" onClick={() => logout()}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

export default AuthorTopNav;
