"use client";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span>{label}</span>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          style={{ width: "3rem", height: "3rem", padding: 0, border: "none" }}
          aria-label={label}
        />
      </label>
      <code style={{ background: "#f3f4f6", padding: "0.5rem", borderRadius: "0.5rem" }}>{value}</code>
    </div>
  );
}
