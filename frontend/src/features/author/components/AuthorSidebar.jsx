import { NavLink, useLocation } from 'react-router-dom';
import { AUTHOR_NAV_ITEMS } from '../constants/navigation.js';
import { getAuthorNavIcon, IconChevronLeft, IconClose } from '../../../components/icons/AdminNavIcons.jsx';
import Button from '../../../components/ui/Button.jsx';

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? 'bg-emerald-50 text-emerald-800'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

export function AuthorSidebar({
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

    if (item.to === '/author/tickets') {
      return location.pathname === '/author/tickets' || location.pathname.startsWith('/author/tickets/');
    }

    return location.pathname.startsWith(item.to);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={`flex items-center justify-between border-b border-slate-200 px-4 py-4 ${collapsed ? 'px-2' : ''}`}>
        <div className={collapsed ? 'w-full text-center' : ''}>
          <p className={`font-semibold text-emerald-800 ${collapsed ? 'text-sm' : 'text-lg'}`}>
            {collapsed ? 'BL' : 'BookLeaf'}
          </p>
          {!collapsed ? (
            <p className="text-xs text-slate-500">Author workspace</p>
          ) : null}
        </div>
        {mobileOpen ? (
          <Button
            variant="ghost"
            className="lg:hidden"
            aria-label="Close navigation menu"
            onClick={onCloseMobile}
          >
            <IconClose />
          </Button>
        ) : null}
      </div>

      <nav aria-label="Author sidebar" className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
        {AUTHOR_NAV_ITEMS.map((item) => {
          const Icon = getAuthorNavIcon(item.label);
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
        aria-label="Author navigation sidebar"
      >
        {sidebarContent}
      </aside>
    </>
  );
}

export default AuthorSidebar;
