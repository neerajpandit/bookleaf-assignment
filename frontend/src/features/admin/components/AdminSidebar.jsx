import { NavLink, useLocation } from 'react-router-dom';
import { ADMIN_NAV_ITEMS } from '../constants/navigation.js';
import { getAdminNavIcon, IconChevronLeft } from '../../../components/icons/AdminNavIcons.jsx';
import Button from '../../../components/ui/Button.jsx';

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-emerald-50 text-emerald-800'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function AdminSidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}) {
  const location = useLocation();

  const isNavItemActive = (item) => {
    if (item.end) {
      return location.pathname === item.to;
    }

    if (item.to.includes('assignedToMe=true')) {
      return (
        location.pathname === '/admin/tickets' &&
        location.search.includes('assignedToMe=true')
      );
    }

    if (item.to === '/admin/tickets') {
      return location.pathname === '/admin/tickets' && !location.search.includes('assignedToMe=true');
    }

    if (item.to === '/admin/authors') {
      return location.pathname === '/admin/authors' || location.pathname.startsWith('/admin/authors/');
    }

    return location.pathname.startsWith(item.to);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={`border-b border-slate-200 px-4 py-4 ${collapsed ? 'px-2' : ''}`}>
        <p className={`font-semibold text-emerald-800 ${collapsed ? 'text-center text-sm' : 'text-lg'}`}>
          {collapsed ? 'BL' : 'BookLeaf'}
        </p>
        {!collapsed ? (
          <p className="text-xs text-slate-500">Administration workspace</p>
        ) : null}
      </div>

      <nav aria-label="Admin sidebar" className="flex-1 space-y-1 px-2 py-4">
        {ADMIN_NAV_ITEMS.map((item) => {
          const Icon = getAdminNavIcon(item.label);
          const active = isNavItemActive(item);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={() => navLinkClass({ isActive: active })}
              onClick={onCloseMobile}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span>{item.label}</span> : null}
            </NavLink>
          );
        })}
      </nav>

      <div className="hidden border-t border-slate-200 p-2 lg:block">
        <Button
          variant="ghost"
          className="w-full justify-center"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggleCollapsed}
        >
          <IconChevronLeft className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed ? <span className="ml-2">Collapse</span> : null}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 lg:hidden ${mobileOpen ? 'block' : 'hidden'}`}
        aria-hidden={!mobileOpen}
        onClick={onCloseMobile}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen w-64 border-r border-slate-200 bg-white transition-transform lg:relative lg:z-auto lg:shrink-0 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
        aria-label="Admin navigation sidebar"
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default AdminSidebar;
