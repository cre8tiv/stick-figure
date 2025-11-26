"use client";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div className="flex items-center gap-3">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-12 h-12 p-0 border-none cursor-pointer"
          aria-label={label}
        />
      </label>
      <code className="bg-gray-100 px-3 py-2 rounded-lg text-sm font-mono">{value}</code>
    </div>
  );
}
