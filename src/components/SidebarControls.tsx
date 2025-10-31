"use client";

import { type CSSProperties, useMemo } from "react";

import ColorPicker from "./ColorPicker";
import ViewToggle from "./ViewToggle";
import {
  DEFAULT_POSE,
  JointName,
  PoseGender,
  PoseModel,
  PoseView,
  Vec2
} from "@/models/pose";
import useFigureStore, { type Figure } from "@/state/useFigureStore";

const panelStyle: CSSProperties = {
  display: "grid",
  gap: "1.5rem",
  padding: "1.25rem",
  border: "1px solid #e5e7eb",
  borderRadius: "1rem",
  backgroundColor: "#ffffff"
};

const sectionStyle: CSSProperties = {
  display: "grid",
  gap: "0.75rem"
};

const sectionHeaderStyle: CSSProperties = {
  fontWeight: 600,
  fontSize: "0.95rem"
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "0.5rem"
};

const figureListStyle: CSSProperties = {
  display: "grid",
  gap: "0.5rem"
};

const genderOptions: { value: PoseGender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "neutral", label: "Neutral" }
];

const poseViewOptions: { value: PoseView; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" }
];

const mirrorPairs: [JointName, JointName][] = [
  ["leftShoulder", "rightShoulder"],
  ["leftElbow", "rightElbow"],
  ["leftWrist", "rightWrist"],
  ["leftHip", "rightHip"],
  ["leftKnee", "rightKnee"],
  ["leftAnkle", "rightAnkle"]
];

const centralJoints: JointName[] = ["pelvis", "chest", "neck", "head"];

const mirrorPoint = (originX: number, point: Vec2): Vec2 => ({
  x: originX - (point.x - originX),
  y: point.y
});

const mirrorPoseJoints = (pose: PoseModel): Partial<Record<JointName, Vec2>> => {
  const updates: Partial<Record<JointName, Vec2>> = {};
  const pelvisX = pose.joints.pelvis.position.x;

  for (const joint of centralJoints) {
    updates[joint] = mirrorPoint(pelvisX, pose.joints[joint].position);
  }

  for (const [left, right] of mirrorPairs) {
    updates[left] = mirrorPoint(pelvisX, pose.joints[right].position);
    updates[right] = mirrorPoint(pelvisX, pose.joints[left].position);
  }

  return updates;
};

const cloneDefaultJoints = (): Partial<Record<JointName, Vec2>> => {
  const joints: Partial<Record<JointName, Vec2>> = {};
  for (const joint of Object.keys(DEFAULT_POSE.joints) as JointName[]) {
    const { x, y } = DEFAULT_POSE.joints[joint].position;
    joints[joint] = { x, y };
  }
  return joints;
};

export default function SidebarControls() {
  const {
    figures,
    poses,
    ui,
    actions: {
      addFigure,
      removeFigure,
      setActiveFigure,
      updateFigure,
      updatePose,
      setViewMode
    }
  } = useFigureStore((state) => ({
    figures: state.figures,
    poses: state.poses,
    ui: state.ui,
    actions: {
      addFigure: state.actions.addFigure,
      removeFigure: state.actions.removeFigure,
      setActiveFigure: state.actions.setActiveFigure,
      updateFigure: state.actions.updateFigure,
      updatePose: state.actions.updatePose,
      setViewMode: state.actions.setViewMode
    }
  }));

  const activeFigure = useMemo<Figure | null>(() => {
    return figures.find((figure) => figure.id === ui.activeFigureId) ?? null;
  }, [figures, ui.activeFigureId]);

  const activePose = useMemo<PoseModel | null>(() => {
    if (!activeFigure) {
      return null;
    }
    return poses.find((pose) => pose.id === activeFigure.poseId) ?? null;
  }, [activeFigure, poses]);

  const handleAddFigure = () => {
    const defaultPose = poses[0];
    addFigure({
      id: crypto.randomUUID(),
      label: `Figure ${figures.length + 1}`,
      color: "#2563eb",
      poseId: defaultPose?.id ?? null
    });
  };

  const handleRemoveFigure = () => {
    if (!activeFigure) {
      return;
    }
    removeFigure(activeFigure.id);
  };

  const handleColorChange = (value: string) => {
    if (!activeFigure) {
      return;
    }
    updateFigure(activeFigure.id, { color: value });
  };

  const handleGenderChange = (gender: PoseGender) => {
    if (!activePose) {
      return;
    }
    updatePose(activePose.id, { gender });
  };

  const handlePoseViewChange = (view: PoseView) => {
    if (!activePose) {
      return;
    }
    updatePose(activePose.id, { view });
  };

  const handleResetPose = () => {
    if (!activePose) {
      return;
    }
    updatePose(activePose.id, {
      joints: cloneDefaultJoints(),
      limbs: DEFAULT_POSE.limbs.map((limb) => ({ ...limb }))
    });
  };

  const handleMirrorPose = () => {
    if (!activePose) {
      return;
    }
    updatePose(activePose.id, {
      joints: mirrorPoseJoints(activePose)
    });
  };

  const isPoseControlsDisabled = !activePose;

  return (
    <aside style={panelStyle}>
      <section style={sectionStyle}>
        <header style={sectionHeaderStyle}>Workspace</header>
        <ViewToggle value={ui.viewMode} onChange={setViewMode} />
      </section>

      <section style={sectionStyle}>
        <header style={sectionHeaderStyle}>Figures</header>
        <div style={buttonRowStyle}>
          <button type="button" onClick={handleAddFigure}>
            Add figure
          </button>
          <button type="button" onClick={handleRemoveFigure} disabled={!activeFigure}>
            Remove active
          </button>
        </div>
        <div style={figureListStyle}>
          {figures.length === 0 && (
            <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
              No figures yet. Add one to get started.
            </span>
          )}
          {figures.map((figure) => (
            <label
              key={figure.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
                padding: "0.5rem 0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
                backgroundColor:
                  ui.activeFigureId === figure.id ? "#f3f4f6" : "transparent"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="radio"
                  name="active-figure"
                  checked={ui.activeFigureId === figure.id}
                  onChange={() => setActiveFigure(figure.id)}
                />
                {figure.label}
              </span>
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: "1rem",
                  height: "1rem",
                  borderRadius: "50%",
                  backgroundColor: figure.color,
                  border: "1px solid #d1d5db"
                }}
              />
            </label>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <header style={sectionHeaderStyle}>Figure appearance</header>
        {activeFigure ? (
          <ColorPicker
            label={`Color for ${activeFigure.label}`}
            value={activeFigure.color}
            onChange={handleColorChange}
          />
        ) : (
          <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>
            Choose a figure to edit its color.
          </span>
        )}
      </section>

      <section style={sectionStyle}>
        <header style={sectionHeaderStyle}>Pose settings</header>
        <div style={buttonRowStyle}>
          {poseViewOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handlePoseViewChange(option.value)}
              disabled={isPoseControlsDisabled}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "9999px",
                border: "1px solid #d1d5db",
                backgroundColor:
                  activePose?.view === option.value ? "#111827" : "transparent",
                color: activePose?.view === option.value ? "#f9fafb" : "#111827",
                cursor: isPoseControlsDisabled ? "not-allowed" : "pointer",
                opacity: isPoseControlsDisabled ? 0.5 : 1
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div style={buttonRowStyle}>
          {genderOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleGenderChange(option.value)}
              disabled={isPoseControlsDisabled}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "9999px",
                border: "1px solid #d1d5db",
                backgroundColor:
                  activePose?.gender === option.value ? "#111827" : "transparent",
                color: activePose?.gender === option.value ? "#f9fafb" : "#111827",
                cursor: isPoseControlsDisabled ? "not-allowed" : "pointer",
                opacity: isPoseControlsDisabled ? 0.5 : 1
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section style={sectionStyle}>
        <header style={sectionHeaderStyle}>Presets & symmetry</header>
        <div style={buttonRowStyle}>
          <button type="button" onClick={handleResetPose} disabled={isPoseControlsDisabled}>
            Reset pose
          </button>
          <button type="button" onClick={handleMirrorPose} disabled={isPoseControlsDisabled}>
            Mirror pose
          </button>
        </div>
      </section>
    </aside>
  );
}
