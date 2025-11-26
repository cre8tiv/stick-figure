import { Vec2 } from "./pose";

export type SideJointName =
  | "ponytail"
  | "head"
  | "neck"
  | "chest"
  | "shoulder"
  | "elbow"
  | "wrist"
  | "pelvis"
  | "hip"
  | "knee"
  | "ankle";

export interface SideJointState {
  position: Vec2;
}

export type SideJointStateMap = Record<SideJointName, SideJointState>;

export interface SideLimb {
  name: string;
  from: SideJointName;
  to: SideJointName;
}

export interface SidePoseModel {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  view: "side";
  joints: SideJointStateMap;
  limbs: SideLimb[];
}

export const DEFAULT_SIDE_LIMBS: SideLimb[] = [
  { name: "ponytail", from: "head", to: "ponytail" },
  { name: "head", from: "neck", to: "head" },
  { name: "neck", from: "chest", to: "neck" },
  { name: "spine", from: "chest", to: "pelvis" },
  { name: "shoulder", from: "chest", to: "shoulder" },
  { name: "upperArm", from: "shoulder", to: "elbow" },
  { name: "lowerArm", from: "elbow", to: "wrist" },
  { name: "hip", from: "pelvis", to: "hip" },
  { name: "thigh", from: "hip", to: "knee" },
  { name: "calf", from: "knee", to: "ankle" }
];

export const DEFAULT_SIDE_POSE: SidePoseModel = {
  id: "pose-default-side",
  name: "Default Side Pose",
  gender: "female",
  view: "side",
  joints: {
    ponytail: { position: { x: -0.8, y: -2.0 } },
    head: { position: { x: 0, y: -2.2 } },
    neck: { position: { x: 0, y: -1.6 } },
    chest: { position: { x: 0, y: -1.0 } },
    shoulder: { position: { x: 0.2, y: -1.0 } },
    elbow: { position: { x: 0.5, y: -0.4 } },
    wrist: { position: { x: 0.4, y: 0.2 } },
    pelvis: { position: { x: 0, y: 0 } },
    hip: { position: { x: 0, y: 0.2 } },
    knee: { position: { x: 0, y: 1.4 } },
    ankle: { position: { x: 0, y: 2.6 } }
  },
  limbs: DEFAULT_SIDE_LIMBS
};

export const ALL_SIDE_JOINTS: SideJointName[] = Object.keys(
  DEFAULT_SIDE_POSE.joints
) as SideJointName[];
