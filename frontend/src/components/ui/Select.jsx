export function Select({ id, className = '', hasError = false, children, ...props }) {
  return (
    <select
      id={id}
      className={`block w-full rounded-md border px-3 py-2 text-sm shadow-sm transition-colors ${
        hasError
          ? 'border-red-500 focus:border-red-500'
          : 'border-slate-300 focus:border-emerald-600'
      } bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export default Select;
