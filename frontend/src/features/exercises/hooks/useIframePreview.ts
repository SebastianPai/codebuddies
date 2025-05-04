import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { convertImageToBase64 } from "../services/imageService";
import { Exercise } from "@/types/exercise";

interface UseIframePreviewReturn {
  iframeContent: string;
  isIframeLoading: boolean;
}

export const useIframePreview = (
  htmlCode: string,
  cssCode: string,
  exercise?: Exercise | null
): UseIframePreviewReturn => {
  const [iframeContent, setIframeContent] = useState("");
  const [isIframeLoading, setIsIframeLoading] = useState(false);

  useEffect(() => {
    const generateIframeContent = async () => {
      setIsIframeLoading(true);
      try {
        toast.dismiss();
        const imageUrls: string[] = [];
        htmlCode.replace(/<img[^>]+src=["'](.*?)["']/gi, (_match, url) => {
          imageUrls.push(url);
          return _match;
        });

        const resolvedUrls = await Promise.all(
          imageUrls.map(async (url) => {
            if (url.startsWith("data:")) return url;
            return await convertImageToBase64(url);
          })
        );

        let index = 0;
        const proxiedHtmlCode = htmlCode.replace(
          /<img([^>]*?)src=["'](.*?)["']([^>]*?)>/gi,
          (_match, beforeSrc, _url, afterSrc) => {
            const base64Url = resolvedUrls[index++] || "";
            return `<img ${beforeSrc} src="${base64Url}" ${afterSrc}>`;
          }
        );

        const cssContent =
          exercise?.language === "html" || exercise?.language === "css"
            ? cssCode
            : "";
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>${cssContent}</style>
          </head>
          <body>
            ${proxiedHtmlCode}
          </body>
          </html>
        `;
        setIframeContent(htmlContent);
      } catch (error) {
        console.error("Error al generar el contenido del iframe:", error);
        toast.error("Error al cargar la vista previa.", {
          toastId: "iframe-error",
          autoClose: 3000,
        });
        setIframeContent(`
          <!DOCTYPE html>
          <html>
          <body>
            <p>Error al cargar la vista previa.</p>
          </body>
          </html  </html>
        `);
      } finally {
        setIsIframeLoading(false);
      }
    };

    if (htmlCode || cssCode) {
      generateIframeContent();
    }
  }, [htmlCode, cssCode, exercise]);

  return { iframeContent, isIframeLoading };
};
