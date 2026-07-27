export function generateFileName(original: string) {
  const ext = original.split('.').pop();

  const random = Math.random().toString(36).slice(2, 8);

  return `${Date.now()}-${random}.${ext}`;
}
