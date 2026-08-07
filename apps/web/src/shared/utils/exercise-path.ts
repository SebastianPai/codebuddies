export function exercisePath(
  id: string,
  type: "QUIZ" | "CODE" | "LIVE" | string,
): string {
  return `/learn/exercise/${type.toLowerCase()}/${id}`;
}
