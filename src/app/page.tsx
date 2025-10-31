"use client";

import { CanvasEditor, CanvasWrapper, SidebarControls } from "@/components";
import useFigureStore from "@/state/useFigureStore";

export default function HomePage() {
  const { poses } = useFigureStore((state) => ({ poses: state.poses }));

  return (
    <section style={{ display: "grid", gap: "1.5rem" }}>
      <header>
        <h1 style={{ margin: 0 }}>Stick Figure Studio</h1>
        <p style={{ margin: "0.25rem 0 0" }}>
          Manage figures, experiment with poses, and adjust how you view the canvas.
        </p>
      </header>

      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          alignItems: "flex-start",
          flexWrap: "wrap"
        }}
      >
        <div style={{ flex: "1 1 480px", minWidth: "min(100%, 480px)" }}>
          <CanvasWrapper>
            <CanvasEditor />
          </CanvasWrapper>
        </div>
        <div style={{ flex: "1 1 280px", maxWidth: "360px", minWidth: "min(100%, 280px)" }}>
          <SidebarControls />
        </div>
      </div>

      {poses.length > 0 && (
        <section style={{ display: "grid", gap: "0.75rem" }}>
          <strong>Poses</strong>
          <ul style={{ margin: 0, paddingLeft: "1rem", display: "grid", gap: "0.75rem" }}>
            {poses.map((pose) => (
              <li key={pose.id} style={{ listStyle: "disc inside" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <strong>{pose.name}</strong>
                  <span style={{ fontSize: "0.875rem", color: "#4b5563" }}>
                    {pose.view === "front" ? "Front" : "Side"} view ·{" "}
                    {pose.gender.charAt(0).toUpperCase() + pose.gender.slice(1)} body
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    {Object.keys(pose.joints).length} joints · {pose.limbs.length} limbs
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
