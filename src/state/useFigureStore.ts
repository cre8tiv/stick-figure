import { create } from "zustand";

import {
  DEFAULT_POSE,
  JointName,
  JointStateMap,
  Limb,
  PoseGender,
  PoseModel,
  PoseView,
  Vec2
} from "@/models/pose";
import { moveJointWithinConstraints, moveMultipleJoints } from "@/utils/kinematics";

export interface Figure {
  id: string;
  label: string;
  color: string;
  poseId: string | null;
}

type ViewMode = "2d" | "3d";

type PoseUpdates = Partial<Omit<PoseModel, "id" | "joints" | "limbs">> & {
  joints?: Partial<Record<JointName, Vec2>>;
  limbs?: Limb[];
};

interface UIState {
  activeFigureId: string | null;
  showGrid: boolean;
  viewMode: ViewMode;
}

interface FigureStore {
  figures: Figure[];
  poses: PoseModel[];
  ui: UIState;
  actions: {
    addFigure: (figure: Figure) => void;
    updateFigure: (id: string, updates: Partial<Figure>) => void;
    removeFigure: (id: string) => void;
    addPose: (pose: PoseModel) => void;
    updatePose: (id: string, updates: PoseUpdates) => void;
    movePoseJoint: (id: string, joint: JointName, target: Vec2) => void;
    movePoseJoints: (id: string, targets: Partial<Record<JointName, Vec2>>) => void;
    removePose: (id: string) => void;
    setActiveFigure: (id: string | null) => void;
    toggleGrid: () => void;
    setViewMode: (mode: ViewMode) => void;
  };
}

const cloneJoints = (joints: JointStateMap): JointStateMap => {
  const cloned = {} as JointStateMap;
  for (const joint of Object.keys(joints) as JointName[]) {
    cloned[joint] = { position: { ...joints[joint].position } };
  }
  return cloned;
};

const clonePose = (pose: PoseModel): PoseModel => ({
  ...pose,
  joints: cloneJoints(pose.joints),
  limbs: pose.limbs.map((limb) => ({ ...limb }))
});

const useFigureStore = create<FigureStore>((set) => ({
  figures: [],
  poses: [clonePose(DEFAULT_POSE)],
  ui: {
    activeFigureId: null,
    showGrid: true,
    viewMode: "2d"
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

          let nextPose: PoseModel = {
            ...pose,
            ...updates,
            joints: pose.joints,
            limbs: updates.limbs ? updates.limbs.map((limb) => ({ ...limb })) : pose.limbs
          };

          if (updates.gender) {
            nextPose = { ...nextPose, gender: updates.gender as PoseGender };
          }

          if (updates.view) {
            nextPose = { ...nextPose, view: updates.view as PoseView };
          }

          if (updates.joints) {
            nextPose = {
              ...nextPose,
              joints: moveMultipleJoints(nextPose.joints, updates.joints)
            };
          }

          return nextPose;
        })
      })),
    movePoseJoint: (id, joint, target) =>
      set((state) => ({
        poses: state.poses.map((pose) =>
          pose.id === id
            ? {
                ...pose,
                joints: moveJointWithinConstraints(pose.joints, joint, target)
              }
            : pose
        )
      })),
    movePoseJoints: (id, targets) =>
      set((state) => ({
        poses: state.poses.map((pose) =>
          pose.id === id
            ? {
                ...pose,
                joints: moveMultipleJoints(pose.joints, targets)
              }
            : pose
        )
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
      }))
  }
}));

export default useFigureStore;
export type { ViewMode };
export type { PoseModel, PoseGender, PoseView };
export type { JointName, Vec2 };
