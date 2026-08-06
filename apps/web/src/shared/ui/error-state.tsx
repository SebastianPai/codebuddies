interface ErrorStateProps {
  message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div
      className="rounded-2xl border border-[rgb(var(--error))] bg-[rgb(var(--error)/0.1)] p-4 text-[rgb(var(--error-text))]"
      role="alert"
    >
      {message}
    </div>
  );
}
