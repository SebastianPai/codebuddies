interface SuccessStateProps {
  message: string;
}

export function SuccessState({ message }: SuccessStateProps) {
  return (
    <div
      className="rounded-2xl border border-[rgb(var(--success))] bg-[rgb(var(--success)/0.1)] p-4 text-[rgb(var(--success-text))]"
      role="status"
    >
      {message}
    </div>
  );
}
