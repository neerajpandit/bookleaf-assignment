import { Link } from 'react-router-dom';
import { IconChevronLeft } from '../icons/NavIcons.jsx';

export function BackButton({ to, label = 'Go back', className = '' }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-emerald-800 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${className}`}
    >
      <IconChevronLeft />
      Back
    </Link>
  );
}

export default BackButton;
