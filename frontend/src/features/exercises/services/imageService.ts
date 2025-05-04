export const convertImageToBase64 = async (
  imageUrl: string
): Promise<string> => {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`No se pudo cargar la imagen: ${response.status}`);
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error al convertir imagen a base64:", error);
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  }
};
