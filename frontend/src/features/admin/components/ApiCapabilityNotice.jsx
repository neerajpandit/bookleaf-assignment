export function ApiCapabilityNotice({ title, description, missingEndpoints = [] }) {
  return (
    <div
      className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      role="note"
    >
      <p className="font-medium">{title}</p>
      {description ? <p className="mt-1 text-amber-800">{description}</p> : null}
      {missingEndpoints.length ? (
        <ul className="mt-2 list-inside list-disc text-xs text-amber-800">
          {missingEndpoints.map((endpoint) => (
            <li key={endpoint}>{endpoint}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default ApiCapabilityNotice;
