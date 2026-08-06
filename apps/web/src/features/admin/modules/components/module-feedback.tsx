import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ModuleFeedbackProps {
  error: string | null;
  isSuccess: boolean;
  successMessage: string;
}

export function ModuleFeedback({
  error,
  isSuccess,
  successMessage,
}: ModuleFeedbackProps) {
  return (
    <>
      {isSuccess && (
        <div className="bg-green-500/10 border border-green-500 text-green-400 p-4 rounded-md flex items-center gap-3">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 p-4 rounded-md flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
    </>
  );
}
