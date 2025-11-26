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
      className="inline-flex rounded-full border border-gray-300 overflow-hidden"
    >
      {buttons.map((button) => {
        const isActive = value === button.value;
        return (
          <button
            key={button.value}
            type="button"
            onClick={() => onChange(button.value)}
            className={`px-4 py-2 border-none cursor-pointer transition-colors ${
              isActive
                ? "bg-gray-900 text-white font-semibold"
                : "bg-transparent text-gray-900 font-medium hover:bg-gray-100"
            }`}
          >
            {button.label}
          </button>
        );
      })}
    </div>
  );
}
