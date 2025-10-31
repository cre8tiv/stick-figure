"use client";

import { CanvasWrapper, ColorPicker, ViewToggle } from "@/components";
import useFigureStore from "@/state/useFigureStore";

export default function HomePage() {
  const {
    figures,
    poses,
    ui,
    actions: { addFigure, updateFigure, setViewMode, setActiveFigure }
  } = useFigureStore();

  const activeFigure = figures.find((figure) => figure.id === ui.activeFigureId);

  return (
    <section style={{ display: "grid", gap: "1.5rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Stick Figure Studio</h1>
          <p style={{ margin: "0.25rem 0 0" }}>
            Manage figures, experiment with poses, and adjust how you view the canvas.
          </p>
        </div>
        <ViewToggle
          value={ui.viewMode}
          onChange={(mode) => setViewMode(mode)}
        />
      </header>

      <CanvasWrapper>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}
        >
          <strong>Active Pose</strong>
          {poses.length === 0 ? (
            <p>No poses defined yet. Use the state store to add some!</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: "1rem" }}>
              {poses.map((pose) => (
                <li key={pose.id}>{pose.name}</li>
              ))}
            </ul>
          )}
        </div>
      </CanvasWrapper>

      <section style={{ display: "grid", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={() =>
              addFigure({
                id: crypto.randomUUID(),
                label: `Figure ${figures.length + 1}`,
                color: "#2563eb",
                poseId: poses[0]?.id ?? null
              })
            }
          >
            Add Figure
          </button>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            Active Figure:
            <select
              value={ui.activeFigureId ?? ""}
              onChange={(event) => setActiveFigure(event.target.value || null)}
            >
              <option value="">None</option>
              {figures.map((figure) => (
                <option key={figure.id} value={figure.id}>
                  {figure.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {activeFigure && (
          <ColorPicker
            label={`Color for ${activeFigure.label}`}
            value={activeFigure.color}
            onChange={(value) =>
              updateFigure(activeFigure.id, {
                color: value
              })
            }
          />
        )}
      </section>
    </section>
  );
}
