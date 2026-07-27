"use client";

export default function AnimationPreview({ sprites }: any) {
  if (!sprites) return null;

  return (
    <div className="grid grid-cols-6 gap-2 mt-4">
      {sprites.map((s: any, i: number) => (
        <img key={i} src={s.imageUrl} className="w-16 h-16 object-contain" />
      ))}
    </div>
  );
}
