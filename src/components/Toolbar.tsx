"use client";

import ColorPicker from "./ColorPicker";
import {
  DEFAULT_POSE,
  PoseGender,
  PoseModel,
  PoseView,
  Vec2,
  isFrontPose,
  isSidePose,
  FrontJointName,
  SideJointName,
  DEFAULT_FRONT_POSE,
  DEFAULT_SIDE_POSE
} from "@/models/pose";
import useFigureStore, { type Figure } from "@/state/useFigureStore";

const GRID_UNIT_SIZE = 24;

const genderOptions: { value: PoseGender; label: string; icon: string }[] = [
  { value: "female", label: "Female", icon: "♀" },
  { value: "male", label: "Male", icon: "♂" }
];

const poseViewOptions: { value: PoseView; label: string }[] = [
  { value: "front", label: "Front" },
  { value: "side", label: "Side" }
];

const frontMirrorPairs: [FrontJointName, FrontJointName][] = [
  ["leftShoulder", "rightShoulder"],
  ["leftElbow", "rightElbow"],
  ["leftWrist", "rightWrist"],
  ["leftHip", "rightHip"],
  ["leftKnee", "rightKnee"],
  ["leftAnkle", "rightAnkle"]
];

const frontCentralJoints: FrontJointName[] = ["pelvis", "chest", "neck", "head"];

const mirrorPoint = (originX: number, point: Vec2): Vec2 => ({
  x: originX - (point.x - originX),
  y: point.y
});

const mirrorFrontPoseJoints = (pose: PoseModel): Partial<Record<string, Vec2>> => {
  if (!isFrontPose(pose)) {
    return {};
  }

  const updates: Partial<Record<string, Vec2>> = {};
  const pelvisX = pose.joints.pelvis.position.x;

  for (const joint of frontCentralJoints) {
    updates[joint] = mirrorPoint(pelvisX, pose.joints[joint].position);
  }

  for (const [left, right] of frontMirrorPairs) {
    updates[left] = mirrorPoint(pelvisX, pose.joints[right].position);
    updates[right] = mirrorPoint(pelvisX, pose.joints[left].position);
  }

  return updates;
};

const clonePoseJoints = (pose: PoseModel): Partial<Record<string, Vec2>> => {
  const joints: Partial<Record<string, Vec2>> = {};

  if (isFrontPose(pose)) {
    for (const joint in DEFAULT_FRONT_POSE.joints) {
      const key = joint as FrontJointName;
      const { x, y } = DEFAULT_FRONT_POSE.joints[key].position;
      joints[joint] = { x, y };
    }
  } else {
    for (const joint in DEFAULT_SIDE_POSE.joints) {
      const key = joint as SideJointName;
      const { x, y } = DEFAULT_SIDE_POSE.joints[key].position;
      joints[joint] = { x, y };
    }
  }

  return joints;
};

export default function Toolbar() {
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
      addPose,
      removePose,
      toggleGrid,
      bringFigureToFront,
      bringFigureForward,
      sendFigureBackward,
      sendFigureToBack,
      switchPoseView
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
        addPose: state.actions.addPose,
        removePose: state.actions.removePose,
        toggleGrid: state.actions.toggleGrid,
        bringFigureToFront: state.actions.bringFigureToFront,
        bringFigureForward: state.actions.bringFigureForward,
        sendFigureBackward: state.actions.sendFigureBackward,
        sendFigureToBack: state.actions.sendFigureToBack,
        switchPoseView: state.actions.switchPoseView
      }
  }));

  const activeFigure = figures.find((figure) => figure.id === ui.activeFigureId) ?? null;
  const activePose = activeFigure
    ? poses.find((pose) => pose.id === activeFigure.poseId) ?? null
    : null;

  const handleAddFigure = () => {
    const figureNumber = figures.length + 1;
    const figureLabel = `Figure ${figureNumber}`;
    const basePose = activePose ?? DEFAULT_POSE;
    const newPoseId = crypto.randomUUID();

    let newPose: PoseModel;

    if (isFrontPose(basePose)) {
      const joints = {} as typeof basePose.joints;
      for (const joint in basePose.joints) {
        const key = joint as FrontJointName;
        const { x, y } = basePose.joints[key].position;
        joints[key] = { position: { x, y } };
      }
      newPose = {
        id: newPoseId,
        name: `${figureLabel} Pose`,
        gender: basePose.gender,
        view: "front",
        joints,
        limbs: basePose.limbs.map((limb) => ({ ...limb }))
      };
    } else {
      const joints = {} as typeof basePose.joints;
      for (const joint in basePose.joints) {
        const key = joint as SideJointName;
        const { x, y } = basePose.joints[key].position;
        joints[key] = { position: { x, y } };
      }
      newPose = {
        id: newPoseId,
        name: `${figureLabel} Pose`,
        gender: basePose.gender,
        view: "side",
        joints,
        limbs: basePose.limbs.map((limb) => ({ ...limb }))
      };
    }

    addPose(newPose);
    addFigure({
      id: crypto.randomUUID(),
      label: figureLabel,
      color: "#2563eb",
      poseId: newPoseId
    });
  };

  const handleRemoveFigure = () => {
    if (!activeFigure) return;
    const { id: figureId, poseId } = activeFigure;
    const poseInUse =
      poseId && figures.some((figure) => figure.id !== figureId && figure.poseId === poseId);

    removeFigure(figureId);
    if (poseId && !poseInUse) {
      removePose(poseId);
    }
  };

  const handleColorChange = (value: string) => {
    if (!activeFigure) return;
    updateFigure(activeFigure.id, { color: value });
  };

  const handleGenderChange = (gender: PoseGender) => {
    if (!activePose) return;
    updatePose(activePose.id, { gender });
  };

  const handlePoseViewChange = (view: PoseView) => {
    if (!activePose) return;
    switchPoseView(activePose.id, view);
  };

  const handleResetPose = () => {
    if (!activePose) return;
    updatePose(activePose.id, {
      joints: clonePoseJoints(activePose)
    });
  };

  const handleMirrorPose = () => {
    if (!activePose) return;

    // Only front poses can be mirrored (side poses don't have symmetry)
    if (isFrontPose(activePose)) {
      updatePose(activePose.id, {
        joints: mirrorFrontPoseJoints(activePose)
      });
    }
  };

  const handleResetTransform = () => {
    if (!activeFigure) return;
    updateFigure(activeFigure.id, { position: { x: 0, y: 0 }, rotation: 0 });
  };

  const isPoseControlsDisabled = !activePose;
  const isMirrorDisabled = !activePose || !isFrontPose(activePose);

  return (
    <div className="fixed left-0 top-0 bottom-0 w-[320px] bg-white border-r border-gray-200 shadow-lg z-50 overflow-y-auto">
      <div className="p-4">
        {/* Header */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Stick Figure Studio</h1>
          <p className="text-sm text-gray-600 mt-1">Create and pose figures</p>
        </div>

        {/* Grid Toggle */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={ui.showGrid}
              onChange={toggleGrid}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Show Grid</span>
          </label>
        </div>

        {/* Figures */}
        <div className="mb-6 pb-4 border-b border-gray-200">
          <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
            Figures
          </label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={handleAddFigure}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Add
            </button>
            <button
              onClick={handleRemoveFigure}
              disabled={!activeFigure}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Remove
            </button>
          </div>
          {figures.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No figures yet</p>
          ) : (
            <div className="space-y-2">
              {figures.map((figure) => (
                <label
                  key={figure.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    ui.activeFigureId === figure.id
                      ? "bg-blue-50 border-2 border-blue-500"
                      : "border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="active-figure"
                    checked={ui.activeFigureId === figure.id}
                    onChange={() => setActiveFigure(figure.id)}
                    className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div
                      className="w-3 h-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: figure.color }}
                    />
                    <span className="text-sm font-medium">{figure.label}</span>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {activeFigure && (
          <>
            {/* Color Picker */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Appearance
              </label>
              <ColorPicker
                label={`Color for ${activeFigure.label}`}
                value={activeFigure.color}
                onChange={handleColorChange}
              />
            </div>

            {/* Position & Rotation */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Position & Rotation
              </label>
              <div className="space-y-3">
                {/* Position Controls */}
                <div>
                  <label className="block text-xs text-gray-700 mb-2">Position (grid units)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">X</label>
                      <input
                        type="number"
                        step={1}
                        value={Math.round((activeFigure.position?.x || 0) / GRID_UNIT_SIZE)}
                        onChange={(e) => updateFigure(activeFigure.id, {
                          position: {
                            x: (parseFloat(e.target.value) || 0) * GRID_UNIT_SIZE,
                            y: activeFigure.position?.y || 0
                          }
                        })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Y</label>
                      <input
                        type="number"
                        step={1}
                        value={Math.round((activeFigure.position?.y || 0) / GRID_UNIT_SIZE)}
                        onChange={(e) => updateFigure(activeFigure.id, {
                          position: {
                            x: activeFigure.position?.x || 0,
                            y: (parseFloat(e.target.value) || 0) * GRID_UNIT_SIZE
                          }
                        })}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Rotation Control */}
                <div>
                  <label className="block text-xs text-gray-700 mb-2">Rotation</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={(activeFigure.rotation || 0) * 180 / Math.PI}
                      onChange={(e) => updateFigure(activeFigure.id, {
                        rotation: (parseFloat(e.target.value) || 0) * Math.PI / 180
                      })}
                      className="flex-1"
                    />
                    <input
                      type="number"
                      min="0"
                      max="360"
                      value={Math.round((activeFigure.rotation || 0) * 180 / Math.PI)}
                      onChange={(e) => updateFigure(activeFigure.id, {
                        rotation: (parseFloat(e.target.value) || 0) * Math.PI / 180
                      })}
                      className="w-16 px-2 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={handleResetTransform}
                  className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  Reset Transform
                </button>
              </div>
            </div>

            {/* Limb Width Control */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Limb Width
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={activeFigure.limbWidth || 4}
                  onChange={(e) => updateFigure(activeFigure.id, {
                    limbWidth: parseFloat(e.target.value) || 4
                  })}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={activeFigure.limbWidth || 4}
                  onChange={(e) => updateFigure(activeFigure.id, {
                    limbWidth: parseFloat(e.target.value) || 4
                  })}
                  className="w-16 px-2 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Body Width Control */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Body Width
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="40"
                  value={activeFigure.bodyWidth || 4}
                  onChange={(e) => updateFigure(activeFigure.id, {
                    bodyWidth: parseFloat(e.target.value) || 4
                  })}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={activeFigure.bodyWidth || 4}
                  onChange={(e) => updateFigure(activeFigure.id, {
                    bodyWidth: parseFloat(e.target.value) || 4
                  })}
                  className="w-16 px-2 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Head Size Control */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Head Size
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={activeFigure.headSize || 1}
                  onChange={(e) => updateFigure(activeFigure.id, {
                    headSize: parseFloat(e.target.value) || 1
                  })}
                  className="flex-1"
                />
                <input
                  type="number"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={activeFigure.headSize || 1}
                  onChange={(e) => updateFigure(activeFigure.id, {
                    headSize: parseFloat(e.target.value) || 1
                  })}
                  className="w-16 px-2 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            {/* Pose Settings */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Pose Settings
              </label>
              <div className="space-y-4">
                {/* View Toggle */}
                <div>
                  <label className="block text-xs text-gray-700 mb-2">View</label>
                  <div className="flex gap-2">
                    {poseViewOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handlePoseViewChange(option.value)}
                        disabled={isPoseControlsDisabled}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                          activePose?.view === option.value
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gender Toggle */}
                <div>
                  <label className="block text-xs text-gray-700 mb-2">Body Type</label>
                  <div className="flex gap-2">
                    {genderOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleGenderChange(option.value)}
                        disabled={isPoseControlsDisabled}
                        className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                          activePose?.gender === option.value
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                        }`}
                      >
                        <span className="mr-1">{option.icon}</span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Actions
              </label>
              <div className="space-y-2">
                <button
                  onClick={handleResetPose}
                  disabled={isPoseControlsDisabled}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                >
                  Reset Pose
                </button>
                <button
                  onClick={handleMirrorPose}
                  disabled={isMirrorDisabled}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  title={isSidePose(activePose!) ? "Mirror is only available for front view" : ""}
                >
                  Mirror Pose
                </button>
              </div>
            </div>

            {/* Layer Controls */}
            <div className="mb-6">
              <label className="block text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                Layer Order
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => bringFigureToFront(activeFigure.id)}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Bring to Front
                </button>
                <button
                  onClick={() => bringFigureForward(activeFigure.id)}
                  className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
                >
                  Move Forward
                </button>
                <button
                  onClick={() => sendFigureBackward(activeFigure.id)}
                  className="w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
                >
                  Move Backward
                </button>
                <button
                  onClick={() => sendFigureToBack(activeFigure.id)}
                  className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  Send to Back
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
