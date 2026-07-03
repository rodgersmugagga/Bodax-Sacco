export default function FormField({ label, error, ...props }) {
  return (
    <label className={`field${error ? ' field-error' : ''}`}>
      <span>{label}</span>
      <input {...props} />
      {error && <small className="field-error-msg">{error}</small>}
    </label>
  );
}
