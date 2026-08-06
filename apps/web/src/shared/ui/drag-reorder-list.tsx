"use client";
import { useState } from "react";
import { GripVertical } from "lucide-react";
import { classNames } from "../utils/class-names";

export interface DragReorderItem {
  id: string;
  label: string;
  meta?: string;
}

interface DragReorderListProps {
  items: DragReorderItem[];
  onReorder: (items: DragReorderItem[]) => void;
  renderActions?: (item: DragReorderItem) => React.ReactNode;
}

// Drag-and-drop nativo (HTML5 DnD), sin dependencia nueva — alcanza para
// reordenar una lista de una sola columna como lecciones/ejercicios (HI10).
export function DragReorderList({ items, onReorder, renderActions }: DragReorderListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setOverId(null);
      return;
    }
    const fromIndex = items.findIndex((item) => item.id === draggedId);
    const toIndex = items.findIndex((item) => item.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const reordered = [...items];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    onReorder(reordered);
    setDraggedId(null);
    setOverId(null);
  };

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => setDraggedId(item.id)}
          onDragOver={(event) => {
            event.preventDefault();
            if (overId !== item.id) setOverId(item.id);
          }}
          onDragLeave={() => setOverId((current) => (current === item.id ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            handleDrop(item.id);
          }}
          onDragEnd={() => {
            setDraggedId(null);
            setOverId(null);
          }}
          className={classNames(
            "flex items-center gap-3 rounded-lg border bg-[rgb(var(--card))] px-3 py-2 transition-colors",
            overId === item.id ? "border-[rgb(var(--primary))]" : "border-[rgb(var(--border))]",
            draggedId === item.id ? "opacity-40" : "opacity-100",
          )}
        >
          <span className="cursor-grab text-[rgb(var(--secondary-text))] active:cursor-grabbing">
            <GripVertical size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-[rgb(var(--text))]">{item.label}</p>
            {item.meta && <p className="truncate text-xs text-[rgb(var(--secondary-text))]">{item.meta}</p>}
          </div>
          {renderActions?.(item)}
        </li>
      ))}
    </ul>
  );
}
