import { useTheme } from "@/context/ThemeContext";

interface PreviewPanelProps {
  iframeContent: string;
  isIframeLoading: boolean;
}

export const PreviewPanel = ({
  iframeContent,
  isIframeLoading,
}: PreviewPanelProps) => {
  const { theme } = useTheme();

  if (isIframeLoading) {
    return (
      <div
        className="flex justify-center items-center w-full h-full"
        style={{ background: theme.colors.card }}
      >
        <div
          className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2"
          style={{ borderColor: theme.colors.accent }}
          aria-label="Cargando vista previa"
        ></div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={iframeContent}
      className="w-full h-full rounded-b-lg"
      title="Vista previa del ejercicio"
      style={{
        background: theme.name === "dark" ? "#FFFFFF" : theme.colors.background,
        border: `1px solid ${theme.colors.border}`,
      }}
      sandbox="allow-scripts"
    />
  );
};
