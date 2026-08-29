"use client";

type Props = {
  message: string;
  onRetry?: () => void;
};

export function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950"
    >
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-semibold underline"
        >
          ניסיון חוזר
        </button>
      ) : null}
    </div>
  );
}
