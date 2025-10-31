export type PoseGender = "female" | "male" | "neutral";

export type PoseView = "front" | "side";

export interface Vec2 {
  x: number;
  y: number;
}

export type JointName =
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

export interface JointState {
  position: Vec2;
}

export type JointStateMap = Record<JointName, JointState>;

export interface Limb {
  name: string;
  from: JointName;
  to: JointName;
}

export interface PoseModel {
  id: string;
  name: string;
  gender: PoseGender;
  view: PoseView;
  joints: JointStateMap;
  limbs: Limb[];
}

export const DEFAULT_LIMBS: Limb[] = [
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

export const DEFAULT_POSE: PoseModel = {
  id: "pose-default",
  name: "Default Pose",
  gender: "neutral",
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
  limbs: DEFAULT_LIMBS
};

export const ALL_JOINTS: JointName[] = Object.keys(DEFAULT_POSE.joints) as JointName[];
