import { Vec2 } from "./pose";

export type FrontJointName =
  | "pelvis"
  | "chest"
  | "neck"
  | "head"
  | "leftShoulder"
  | "leftElbow"
  | "leftWrist"
  | "rightShoulder"
  | "rightElbow"
  | "rightWrist"
  | "leftHip"
  | "leftKnee"
  | "leftAnkle"
  | "rightHip"
  | "rightKnee"
  | "rightAnkle";

export interface FrontJointState {
  position: Vec2;
}

export type FrontJointStateMap = Record<FrontJointName, FrontJointState>;

export interface FrontLimb {
  name: string;
  from: FrontJointName;
  to: FrontJointName;
}

export interface FrontPoseModel {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  view: "front";
  joints: FrontJointStateMap;
  limbs: FrontLimb[];
}

export const DEFAULT_FRONT_LIMBS: FrontLimb[] = [
  { name: "spine", from: "pelvis", to: "chest" },
  { name: "neck", from: "chest", to: "neck" },
  { name: "head", from: "neck", to: "head" },
  { name: "leftUpperArm", from: "leftShoulder", to: "leftElbow" },
  { name: "leftLowerArm", from: "leftElbow", to: "leftWrist" },
  { name: "rightUpperArm", from: "rightShoulder", to: "rightElbow" },
  { name: "rightLowerArm", from: "rightElbow", to: "rightWrist" },
  { name: "leftSide", from: "chest", to: "leftShoulder" },
  { name: "rightSide", from: "chest", to: "rightShoulder" },
  { name: "leftHip", from: "pelvis", to: "leftHip" },
  { name: "leftThigh", from: "leftHip", to: "leftKnee" },
  { name: "leftCalf", from: "leftKnee", to: "leftAnkle" },
  { name: "rightHip", from: "pelvis", to: "rightHip" },
  { name: "rightThigh", from: "rightHip", to: "rightKnee" },
  { name: "rightCalf", from: "rightKnee", to: "rightAnkle" }
];

export const DEFAULT_FRONT_POSE: FrontPoseModel = {
  id: "pose-default-front",
  name: "Default Front Pose",
  gender: "male",
  view: "front",
  joints: {
    pelvis: { position: { x: 0, y: 0 } },
    chest: { position: { x: 0, y: -1.2 } },
    neck: { position: { x: 0, y: -1.6 } },
    head: { position: { x: 0, y: -2.2 } },
    leftShoulder: { position: { x: -0.5, y: -1.3 } },
    leftElbow: { position: { x: -0.9, y: -0.6 } },
    leftWrist: { position: { x: -0.9, y: 0.1 } },
    rightShoulder: { position: { x: 0.5, y: -1.3 } },
    rightElbow: { position: { x: 0.9, y: -0.6 } },
    rightWrist: { position: { x: 0.9, y: 0.1 } },
    leftHip: { position: { x: -0.4, y: 0 } },
    leftKnee: { position: { x: -0.4, y: 1.2 } },
    leftAnkle: { position: { x: -0.4, y: 2.4 } },
    rightHip: { position: { x: 0.4, y: 0 } },
    rightKnee: { position: { x: 0.4, y: 1.2 } },
    rightAnkle: { position: { x: 0.4, y: 2.4 } }
  },
  limbs: DEFAULT_FRONT_LIMBS
};

export const ALL_FRONT_JOINTS: FrontJointName[] = Object.keys(
  DEFAULT_FRONT_POSE.joints
) as FrontJointName[];
