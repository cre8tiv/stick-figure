import { create } from "zustand";

type PosePoint = [number, number];

export interface Pose {
  id: string;
  name: string;
  points: PosePoint[];
}

export interface Figure {
  id: string;
  label: string;
  color: string;
  poseId: string | null;
}

type ViewMode = "2d" | "3d";

interface UIState {
  activeFigureId: string | null;
  showGrid: boolean;
  viewMode: ViewMode;
}

interface FigureStore {
  figures: Figure[];
  poses: Pose[];
  ui: UIState;
  actions: {
    addFigure: (figure: Figure) => void;
    updateFigure: (id: string, updates: Partial<Figure>) => void;
    removeFigure: (id: string) => void;
    addPose: (pose: Pose) => void;
    updatePose: (id: string, updates: Partial<Pose>) => void;
    removePose: (id: string) => void;
    setActiveFigure: (id: string | null) => void;
    toggleGrid: () => void;
    setViewMode: (mode: ViewMode) => void;
  };
}

const defaultPose: Pose = {
  id: "pose-default",
  name: "Default Pose",
  points: [
    [0, 0],
    [0, 1],
    [1, 1]
  ]
};

const useFigureStore = create<FigureStore>((set) => ({
  figures: [],
  poses: [defaultPose],
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
        poses: [...state.poses, pose]
      })),
    updatePose: (id, updates) =>
      set((state) => ({
        poses: state.poses.map((pose) =>
          pose.id === id ? { ...pose, ...updates } : pose
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
