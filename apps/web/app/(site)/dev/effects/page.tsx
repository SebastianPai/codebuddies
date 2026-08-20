import { notFound } from "next/navigation";
import { VISUAL_EFFECTS, type EffectUsage } from "@codebuddies/visual-effects";
import { RarityBorder } from "@/shared/ui/rarity-border";
import { RarityText } from "@/shared/ui/rarity-text";

// Página de desarrollo para revisar visualmente los ~25 efectos del sistema
// centralizado antes/mientras se integran en superficies reales. No enlazada
// desde ninguna navegación; oculta en producción.
export default function EffectsKitchenSinkPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const groups: { title: string; usage: EffectUsage }[] = [
    { title: "Item / Badge Rarity", usage: "itemRarity" },
    { title: "Leaderboard Rank", usage: "rankPodium" },
    { title: "Name Effects (full catalog)", usage: "nameEffect" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 text-[rgb(var(--text))]">
      <h1 className="mb-2 text-2xl font-bold">Visual Effects — Kitchen Sink</h1>
      <p className="mb-8 text-sm text-[rgb(var(--secondary-text))]">
        Dev-only page. Toggle OS &quot;reduce motion&quot; to verify the static fallback.
      </p>

      {groups.map((group) => {
        const effects = Object.values(VISUAL_EFFECTS).filter((e) => e.usage.includes(group.usage));
        return (
          <section key={group.usage} className="mb-12">
            <h2 className="mb-4 text-lg font-semibold">{group.title}</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {effects.map((effect) => (
                <RarityBorder key={effect.id} effect={effect.id} glow className="rounded-xl p-4">
                  <RarityText effect={effect.id} as="p" className="text-lg font-bold">
                    {effect.label}
                  </RarityText>
                  <p className="mt-1 text-xs text-[rgb(var(--secondary-text))]">
                    {effect.unlockRule} · {effect.id}
                  </p>
                </RarityBorder>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
