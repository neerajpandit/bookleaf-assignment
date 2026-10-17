import PageHeader from '../../../components/layout/PageHeader.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';

export function AdminAccountPage() {
  const { user, status } = useAuth();

  return (
    <>
      <PageHeader
        title="Account"
        description="Session details from the authenticated administrator profile. Profile editing is not available in the current API."
      />

      <div className="max-w-xl rounded-lg border border-slate-200 bg-white p-4">
        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="text-slate-500">Display name</dt>
            <dd className="font-medium text-slate-900">{user?.name || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-900">{user?.email || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-900">{user?.role || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Session status</dt>
            <dd className="font-medium text-slate-900">
              {status === 'authenticated' ? 'Active administrator session' : status}
            </dd>
          </div>
        </dl>
      </div>
    </>
  );
}

export default AdminAccountPage;
