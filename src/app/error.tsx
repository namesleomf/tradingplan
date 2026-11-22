"use client";
export default function AppError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="loading" role="alert">
      <h1>Unable to open your trading plan</h1>
      <p>Check local browser storage permissions and try again.</p>
      <button className="button outline" onClick={reset}>
        Retry
      </button>
    </main>
  );
}
