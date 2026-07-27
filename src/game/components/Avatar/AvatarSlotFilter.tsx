"use client";

interface Props {
  value: string;
  onChange: (slot: string) => void;
}

const SLOTS = ["ALL", "BODY", "HEAD", "HAIR", "SHIRT", "LEGS", "SHOES"];

export default function AvatarSlotFilter({ value, onChange }: Props) {
  return (
    <div className="slots">
      {SLOTS.map((slot) => (
        <button
          key={slot}
          className={value === slot ? "active" : ""}
          onClick={() => onChange(slot)}
        >
          {slot}
        </button>
      ))}

      <style jsx>{`
        .slots {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 10px;
        }

        button {
          border: none;
          border-radius: 8px;
          padding: 6px 10px;
          cursor: pointer;
          background: #333;
          color: white;
        }

        .active {
          background: #4caf50;
        }
      `}</style>
    </div>
  );
}
