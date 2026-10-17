import Button from '../ui/Button.jsx';

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred.',
  onRetry,
  retryLabel = 'Try again',
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center" role="alert">
      <h2 className="text-base font-semibold text-red-800">{title}</h2>
      <p className="mt-2 text-sm text-red-700">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default ErrorState;
