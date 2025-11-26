export type PoseGender = "female" | "male" | "neutral";

export type PoseView = "front" | "side";

export interface Vec2 {
  x: number;
  y: number;
}

// Re-export specific pose types
export type {
  FrontJointName,
  FrontJointState,
  FrontJointStateMap,
  FrontLimb,
  FrontPoseModel
} from "./front-pose";

export type {
  SideJointName,
  SideJointState,
  SideJointStateMap,
  SideLimb,
  SidePoseModel
} from "./side-pose";

export {
  DEFAULT_FRONT_LIMBS,
  DEFAULT_FRONT_POSE,
  ALL_FRONT_JOINTS
} from "./front-pose";

export {
  DEFAULT_SIDE_LIMBS,
  DEFAULT_SIDE_POSE,
  ALL_SIDE_JOINTS
} from "./side-pose";

// Import the specific pose types
import type { FrontPoseModel } from "./front-pose";
import type { SidePoseModel } from "./side-pose";

// Discriminated union of pose types
export type PoseModel = FrontPoseModel | SidePoseModel;

// Union types for joints and limbs
export type JointName =
  | import("./front-pose").FrontJointName
  | import("./side-pose").SideJointName;

export type Limb =
  | import("./front-pose").FrontLimb
  | import("./side-pose").SideLimb;

export interface JointState {
  position: Vec2;
}

export type JointStateMap = Record<string, JointState>;

// Default pose is front pose
export { DEFAULT_FRONT_POSE as DEFAULT_POSE } from "./front-pose";

// Helper type guards
export function isFrontPose(pose: PoseModel): pose is FrontPoseModel {
  return pose.view === "front";
}

export function isSidePose(pose: PoseModel): pose is SidePoseModel {
  return pose.view === "side";
}
