export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="loading-spinner">
      <div className="spinner" />
      <span>{text}</span>
    </div>
  );
}

export function LoadingRetry({ loading, error, onRetry, children, text = 'Loading...' }) {
  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
        <span>{text}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="loading-retry">
        <p className="alert">{error}</p>
        <button className="btn btn-primary" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  return children;
}
