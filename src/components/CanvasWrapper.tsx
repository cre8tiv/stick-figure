"use client";

import { ReactNode } from "react";
import useFigureStore from "@/state/useFigureStore";

interface CanvasWrapperProps {
  children: ReactNode;
}

const gridBackground =
  "linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(0,0,0,0.08) 1px, transparent 1px)";

export default function CanvasWrapper({ children }: CanvasWrapperProps) {
  const { showGrid, toggleGrid } = useFigureStore((state) => ({
    showGrid: state.ui.showGrid,
    toggleGrid: state.actions.toggleGrid
  }));

  return (
    <div
      style={{
        borderRadius: "1rem",
        border: "1px solid #e5e7eb",
        padding: "2rem",
        backgroundColor: "#ffffff",
        backgroundImage: showGrid ? gridBackground : undefined,
        backgroundSize: "24px 24px",
        minHeight: "320px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        gap: "1rem"
      }}
    >
      {children}
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <input type="checkbox" checked={showGrid} onChange={toggleGrid} />
        Show grid
      </label>
    </div>
  );
}
