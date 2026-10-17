import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import { IconMenu, IconSearch } from '../../../components/icons/AdminNavIcons.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';

function getPageTitle(pathname, search) {
  if (pathname === '/admin') {
    return 'Overview';
  }

  if (pathname === '/admin/account') {
    return 'Account';
  }

  if (pathname === '/admin/authors') {
    return 'All Authors';
  }

  if (/^\/admin\/authors\/[^/]+$/.test(pathname)) {
    return 'Author details';
  }

  if (/^\/admin\/tickets\/[^/]+$/.test(pathname)) {
    return 'Ticket detail';
  }

  if (pathname === '/admin/tickets') {
    return search.includes('assignedToMe=true') ? 'My Assigned Tickets' : 'All Tickets';
  }

  return 'Administration';
}

function getBreadcrumbs(pathname, search) {
  const crumbs = [{ label: 'Admin', to: '/admin' }];

  if (pathname === '/admin/tickets') {
    crumbs.push({
      label: search.includes('assignedToMe=true') ? 'My Assigned Tickets' : 'All Tickets',
      to: pathname + search,
    });
    return crumbs;
  }

  if (pathname === '/admin/account') {
    crumbs.push({ label: 'Account', to: '/admin/account' });
    return crumbs;
  }

  if (pathname === '/admin/authors') {
    crumbs.push({ label: 'All Authors', to: '/admin/authors' });
    return crumbs;
  }

  if (/^\/admin\/authors\/[^/]+$/.test(pathname)) {
    crumbs.push({ label: 'All Authors', to: '/admin/authors' });
    crumbs.push({ label: 'Author details' });
    return crumbs;
  }

  if (/^\/admin\/tickets\/[^/]+$/.test(pathname)) {
    crumbs.push({ label: 'All Tickets', to: '/admin/tickets' });
    crumbs.push({ label: 'Ticket detail' });
    return crumbs;
  }

  if (pathname === '/admin') {
    crumbs.push({ label: 'Overview' });
  }

  return crumbs;
}

export function AdminTopNav({ onOpenMobileSidebar }) {
  const { user, logout, status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');

  const pageTitle = useMemo(
    () => getPageTitle(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const breadcrumbs = useMemo(
    () => getBreadcrumbs(location.pathname, location.search),
    [location.pathname, location.search],
  );

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed) {
      navigate('/admin/tickets');
      return;
    }

    navigate(`/admin/tickets?search=${encodeURIComponent(trimmed)}`);
    setSearchValue('');
  };

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

        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-xl">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:max-w-xs">
            <label htmlFor="admin-global-search" className="sr-only">
              Search tickets
            </label>
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="admin-global-search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search ticket queue…"
              className="pl-9"
            />
          </form>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-medium text-slate-800">
                {user?.name || user?.email || 'Administrator'}
              </p>
              <p className="text-xs text-slate-500">
                {status === 'authenticated' ? 'Signed in' : 'Session unavailable'}
              </p>
            </div>
            <Button variant="ghost" onClick={() => logout()}>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AdminTopNav;
