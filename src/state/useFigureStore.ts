import { create } from "zustand";

import {
  DEFAULT_POSE,
  PoseGender,
  PoseModel,
  PoseView,
  Vec2,
  isFrontPose,
  FrontJointName,
  SideJointName,
  DEFAULT_FRONT_POSE,
  DEFAULT_SIDE_POSE,
  FrontPoseModel,
  SidePoseModel
} from "@/models/pose";
import { moveJointWithinConstraints, moveMultipleJoints } from "@/utils/kinematics";

export interface Figure {
  id: string;
  label: string;
  color: string;
  poseId: string | null;
  position?: { x: number; y: number };
  rotation?: number; // in radians
  limbWidth?: number;
  bodyWidth?: number;
  headSize?: number;
}

type ViewMode = "2d" | "3d";

type PoseUpdates = Partial<Omit<PoseModel, "id" | "joints" | "limbs" | "view">> & {
  joints?: Partial<Record<string, Vec2>>;
};

interface UIState {
  activeFigureId: string | null;
  showGrid: boolean;
  viewMode: ViewMode;
  zoom: number;
}

interface FigureStore {
  figures: Figure[];
  poses: PoseModel[];
  ui: UIState;
  actions: {
    addFigure: (figure: Figure) => void;
    updateFigure: (id: string, updates: Partial<Figure>) => void;
    removeFigure: (id: string) => void;
    reorderFigures: (ids: string[]) => void;
    bringFigureForward: (id: string) => void;
    sendFigureBackward: (id: string) => void;
    bringFigureToFront: (id: string) => void;
    sendFigureToBack: (id: string) => void;
    addPose: (pose: PoseModel) => void;
    updatePose: (id: string, updates: PoseUpdates) => void;
    movePoseJoint: (id: string, joint: string, target: Vec2) => void;
    movePoseJoints: (id: string, targets: Partial<Record<string, Vec2>>) => void;
    removePose: (id: string) => void;
    switchPoseView: (id: string, newView: PoseView) => void;
    setActiveFigure: (id: string | null) => void;
    toggleGrid: () => void;
    setViewMode: (mode: ViewMode) => void;
    setZoom: (zoom: number) => void;
  };
}

const cloneFrontPose = (pose: FrontPoseModel): FrontPoseModel => {
  const clonedJoints = {} as FrontPoseModel["joints"];
  for (const joint in pose.joints) {
    const key = joint as FrontJointName;
    clonedJoints[key] = { position: { ...pose.joints[key].position } };
  }
  return {
    ...pose,
    view: "front",
    joints: clonedJoints,
    limbs: pose.limbs.map((limb) => ({ ...limb }))
  };
};

const cloneSidePose = (pose: SidePoseModel): SidePoseModel => {
  const clonedJoints = {} as SidePoseModel["joints"];
  for (const joint in pose.joints) {
    const key = joint as SideJointName;
    clonedJoints[key] = { position: { ...pose.joints[key].position } };
  }
  return {
    ...pose,
    view: "side",
    joints: clonedJoints,
    limbs: pose.limbs.map((limb) => ({ ...limb }))
  };
};

const clonePose = (pose: PoseModel): PoseModel => {
  if (isFrontPose(pose)) {
    return cloneFrontPose(pose);
  } else {
    return cloneSidePose(pose);
  }
};

const useFigureStore = create<FigureStore>((set) => ({
  figures: [],
  poses: [clonePose(DEFAULT_POSE)],
  ui: {
    activeFigureId: null,
    showGrid: true,
    viewMode: "2d",
    zoom: 100
  },
  actions: {
    addFigure: (figure) =>
      set((state) => ({
        figures: [...state.figures, figure],
        ui: {
          ...state.ui,
          activeFigureId: figure.id
        }
      })),
    updateFigure: (id, updates) =>
      set((state) => ({
        figures: state.figures.map((figure) =>
          figure.id === id ? { ...figure, ...updates } : figure
        )
      })),
    reorderFigures: (ids) =>
      set((state) => {
        const reordered = ids
          .map((id) => state.figures.find((figure) => figure.id === id))
          .filter((figure): figure is Figure => Boolean(figure));
        if (reordered.length !== state.figures.length) {
          return state;
        }
        return { figures: reordered };
      }),
    bringFigureForward: (id) =>
      set((state) => {
        const index = state.figures.findIndex((figure) => figure.id === id);
        if (index === -1 || index === state.figures.length - 1) {
          return state;
        }
        const figures = [...state.figures];
        const [figure] = figures.splice(index, 1);
        figures.splice(index + 1, 0, figure);
        return { figures };
      }),
    sendFigureBackward: (id) =>
      set((state) => {
        const index = state.figures.findIndex((figure) => figure.id === id);
        if (index <= 0) {
          return state;
        }
        const figures = [...state.figures];
        const [figure] = figures.splice(index, 1);
        figures.splice(index - 1, 0, figure);
        return { figures };
      }),
    bringFigureToFront: (id) =>
      set((state) => {
        const index = state.figures.findIndex((figure) => figure.id === id);
        if (index === -1 || index === state.figures.length - 1) {
          return state;
        }
        const figures = [...state.figures];
        const [figure] = figures.splice(index, 1);
        figures.push(figure);
        return { figures };
      }),
    sendFigureToBack: (id) =>
      set((state) => {
        const index = state.figures.findIndex((figure) => figure.id === id);
        if (index <= 0) {
          return state;
        }
        const figures = [...state.figures];
        const [figure] = figures.splice(index, 1);
        figures.unshift(figure);
        return { figures };
      }),
    removeFigure: (id) =>
      set((state) => ({
        figures: state.figures.filter((figure) => figure.id !== id),
        ui: {
          ...state.ui,
          activeFigureId:
            state.ui.activeFigureId === id ? null : state.ui.activeFigureId
        }
      })),
    addPose: (pose) =>
      set((state) => ({
        poses: [...state.poses, clonePose(pose)]
      })),
    updatePose: (id, updates) =>
      set((state) => ({
        poses: state.poses.map((pose) => {
          if (pose.id !== id) {
            return pose;
          }

          if (updates.gender) {
            pose = { ...pose, gender: updates.gender as PoseGender };
          }

          if (updates.joints) {
            const newJoints = moveMultipleJoints(pose, updates.joints);
            if (isFrontPose(pose)) {
              pose = { ...pose, joints: newJoints as FrontPoseModel["joints"] };
            } else {
              pose = { ...pose, joints: newJoints as SidePoseModel["joints"] };
            }
          }

          return pose;
        })
      })),
    movePoseJoint: (id, joint, target) =>
      set((state) => ({
        poses: state.poses.map((pose) => {
          if (pose.id !== id) {
            return pose;
          }
          const newJoints = moveJointWithinConstraints(pose, joint, target);
          if (isFrontPose(pose)) {
            return { ...pose, joints: newJoints as FrontPoseModel["joints"] };
          } else {
            return { ...pose, joints: newJoints as SidePoseModel["joints"] };
          }
        })
      })),
    movePoseJoints: (id, targets) =>
      set((state) => ({
        poses: state.poses.map((pose) => {
          if (pose.id !== id) {
            return pose;
          }
          const newJoints = moveMultipleJoints(pose, targets);
          if (isFrontPose(pose)) {
            return { ...pose, joints: newJoints as FrontPoseModel["joints"] };
          } else {
            return { ...pose, joints: newJoints as SidePoseModel["joints"] };
          }
        })
      })),
    switchPoseView: (id, newView) =>
      set((state) => ({
        poses: state.poses.map((pose) => {
          if (pose.id !== id) {
            return pose;
          }

          // When switching views, create a new pose with the appropriate structure
          if (newView === "front") {
            return cloneFrontPose({
              ...DEFAULT_FRONT_POSE,
              id: pose.id,
              name: pose.name,
              gender: pose.gender
            });
          } else {
            return cloneSidePose({
              ...DEFAULT_SIDE_POSE,
              id: pose.id,
              name: pose.name,
              gender: pose.gender
            });
          }
        })
      })),
    removePose: (id) =>
      set((state) => ({
        poses: state.poses.filter((pose) => pose.id !== id)
      })),
    setActiveFigure: (id) =>
      set((state) => ({
        ui: {
          ...state.ui,
          activeFigureId: id
        }
      })),
    toggleGrid: () =>
      set((state) => ({
        ui: {
          ...state.ui,
          showGrid: !state.ui.showGrid
        }
      })),
    setViewMode: (mode) =>
      set((state) => ({
        ui: {
          ...state.ui,
          viewMode: mode
        }
      })),
    setZoom: (zoom) =>
      set((state) => ({
        ui: {
          ...state.ui,
          zoom
        }
      }))
  }
}));

export default useFigureStore;
export type { ViewMode };
export type { PoseModel, PoseGender, PoseView };
export type { Vec2 };
