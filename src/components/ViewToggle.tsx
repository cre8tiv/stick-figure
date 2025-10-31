"use client";

import type { ViewMode } from "@/state/useFigureStore";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (value: ViewMode) => void;
}

const buttons: { value: ViewMode; label: string }[] = [
  { value: "2d", label: "2D" },
  { value: "3d", label: "3D" }
];

export default function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label="View mode toggle"
      style={{
        display: "inline-flex",
        borderRadius: "9999px",
        border: "1px solid #d1d5db",
        overflow: "hidden"
      }}
    >
      {buttons.map((button) => {
        const isActive = value === button.value;
        return (
          <button
            key={button.value}
            type="button"
            onClick={() => onChange(button.value)}
            style={{
              padding: "0.5rem 1rem",
              background: isActive ? "#111827" : "transparent",
              color: isActive ? "#f9fafb" : "#111827",
              border: "none",
              cursor: "pointer",
              fontWeight: isActive ? 600 : 500
            }}
          >
            {button.label}
          </button>
        );
      })}
    </div>
  );
}
