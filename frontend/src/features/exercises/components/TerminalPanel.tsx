import { useTheme } from "@/context/ThemeContext";

interface TerminalPanelProps {
  terminalOutput: string;
}

export const TerminalPanel = ({ terminalOutput }: TerminalPanelProps) => {
  const { theme } = useTheme();

  return (
    <div
      className="h-1/3 border-t flex flex-col"
      style={{
        background: theme.colors.card,
        borderColor: theme.colors.border,
      }}
    >
      <div
        className="p-2 border-b"
        style={{
          background: theme.colors.card,
          borderColor: theme.colors.border,
        }}
      >
        <h3 style={{ color: theme.colors.text }}>Terminal</h3>
      </div>
      <div
        className="flex-1 p-4 font-mono text-sm overflow-auto"
        style={{ color: theme.colors.text }}
      >
        {terminalOutput || ">"}
      </div>
    </div>
  );
};
