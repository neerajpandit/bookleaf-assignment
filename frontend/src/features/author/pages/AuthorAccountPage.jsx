import PageHeader from '../../../components/layout/PageHeader.jsx';
import { useAuth } from '../../auth/hooks/useAuth.js';
import AuthorProfilePanel from '../../admin/components/AuthorProfilePanel.jsx';
import { AUTHOR_API_GAPS } from '../constants/apiGaps.js';

export function AuthorAccountPage() {
  const { user, status } = useAuth();

  return (
    <>
      <PageHeader
        title="Account"
        description="Your BookLeaf author profile from the authenticated session. Profile editing is not available in the current API."
      />

      <AuthorProfilePanel author={user} />

      <div className="mt-4 max-w-xl rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <dl className="grid gap-3">
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="font-medium text-slate-900">{user?.role || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Session status</dt>
            <dd className="font-medium text-slate-900">
              {status === 'authenticated' ? 'Active author session' : status}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-slate-500">{AUTHOR_API_GAPS.profileEditing}</p>
      </div>
    </>
  );
}

export default AuthorAccountPage;
