import {
  Vec2,
  PoseModel,
  isFrontPose,
  FrontJointName,
  SideJointName,
  FrontJointStateMap,
  SideJointStateMap,
  DEFAULT_FRONT_POSE,
  DEFAULT_SIDE_POSE,
  ALL_FRONT_JOINTS,
  ALL_SIDE_JOINTS
} from "@/models/pose";

export interface JointConstraint<T extends string> {
  parent: T | null;
  length: number;
  minAngle?: number;
  maxAngle?: number;
}

export type FrontJointConstraintMap = Record<FrontJointName, JointConstraint<FrontJointName>>;
export type SideJointConstraintMap = Record<SideJointName, JointConstraint<SideJointName>>;

const distance = (a: Vec2, b: Vec2): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

// Front pose constraints
const frontDefaultPositions = DEFAULT_FRONT_POSE.joints;

const frontConstraintLength = (parent: FrontJointName | null, joint: FrontJointName): number => {
  if (!parent) {
    return 0;
  }
  return distance(frontDefaultPositions[parent].position, frontDefaultPositions[joint].position);
};

export const FRONT_JOINT_CONSTRAINTS: FrontJointConstraintMap = {
  pelvis: {
    parent: null,
    length: 0
  },
  chest: {
    parent: "pelvis",
    length: frontConstraintLength("pelvis", "chest")
  },
  neck: {
    parent: "chest",
    length: frontConstraintLength("chest", "neck")
  },
  head: {
    parent: "neck",
    length: frontConstraintLength("neck", "head")
  },
  leftShoulder: {
    parent: "chest",
    length: frontConstraintLength("chest", "leftShoulder")
  },
  leftElbow: {
    parent: "leftShoulder",
    length: frontConstraintLength("leftShoulder", "leftElbow")
  },
  leftWrist: {
    parent: "leftElbow",
    length: frontConstraintLength("leftElbow", "leftWrist")
  },
  rightShoulder: {
    parent: "chest",
    length: frontConstraintLength("chest", "rightShoulder")
  },
  rightElbow: {
    parent: "rightShoulder",
    length: frontConstraintLength("rightShoulder", "rightElbow")
  },
  rightWrist: {
    parent: "rightElbow",
    length: frontConstraintLength("rightElbow", "rightWrist")
  },
  leftHip: {
    parent: "pelvis",
    length: frontConstraintLength("pelvis", "leftHip")
  },
  leftKnee: {
    parent: "leftHip",
    length: frontConstraintLength("leftHip", "leftKnee")
  },
  leftAnkle: {
    parent: "leftKnee",
    length: frontConstraintLength("leftKnee", "leftAnkle")
  },
  rightHip: {
    parent: "pelvis",
    length: frontConstraintLength("pelvis", "rightHip")
  },
  rightKnee: {
    parent: "rightHip",
    length: frontConstraintLength("rightHip", "rightKnee")
  },
  rightAnkle: {
    parent: "rightKnee",
    length: frontConstraintLength("rightKnee", "rightAnkle")
  }
};

export const FRONT_JOINT_CHILDREN: Record<FrontJointName, FrontJointName[]> = ALL_FRONT_JOINTS.reduce(
  (children, joint) => {
    children[joint] = [];
    return children;
  },
  {} as Record<FrontJointName, FrontJointName[]>
);

for (const [joint, constraint] of Object.entries(FRONT_JOINT_CONSTRAINTS) as [
  FrontJointName,
  JointConstraint<FrontJointName>
][]) {
  if (constraint.parent) {
    FRONT_JOINT_CHILDREN[constraint.parent].push(joint);
  }
}

// Side pose constraints
const sideDefaultPositions = DEFAULT_SIDE_POSE.joints;

const sideConstraintLength = (parent: SideJointName | null, joint: SideJointName): number => {
  if (!parent) {
    return 0;
  }
  return distance(sideDefaultPositions[parent].position, sideDefaultPositions[joint].position);
};

export const SIDE_JOINT_CONSTRAINTS: SideJointConstraintMap = {
  ponytail: {
    parent: "head",
    length: sideConstraintLength("head", "ponytail")
  },
  head: {
    parent: "neck",
    length: sideConstraintLength("neck", "head")
  },
  neck: {
    parent: "chest",
    length: sideConstraintLength("chest", "neck")
  },
  chest: {
    parent: null,
    length: 0
  },
  shoulder: {
    parent: "chest",
    length: sideConstraintLength("chest", "shoulder")
  },
  elbow: {
    parent: "shoulder",
    length: sideConstraintLength("shoulder", "elbow")
  },
  wrist: {
    parent: "elbow",
    length: sideConstraintLength("elbow", "wrist")
  },
  pelvis: {
    parent: "chest",
    length: sideConstraintLength("chest", "pelvis")
  },
  hip: {
    parent: "pelvis",
    length: sideConstraintLength("pelvis", "hip")
  },
  knee: {
    parent: "hip",
    length: sideConstraintLength("hip", "knee")
  },
  ankle: {
    parent: "knee",
    length: sideConstraintLength("knee", "ankle")
  }
};

export const SIDE_JOINT_CHILDREN: Record<SideJointName, SideJointName[]> = ALL_SIDE_JOINTS.reduce(
  (children, joint) => {
    children[joint] = [];
    return children;
  },
  {} as Record<SideJointName, SideJointName[]>
);

for (const [joint, constraint] of Object.entries(SIDE_JOINT_CONSTRAINTS) as [
  SideJointName,
  JointConstraint<SideJointName>
][]) {
  if (constraint.parent) {
    SIDE_JOINT_CHILDREN[constraint.parent].push(joint);
  }
}

// Utility functions
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const degToRad = (degrees: number): number => (degrees * Math.PI) / 180;

export const radToDeg = (radians: number): number => (radians * 180) / Math.PI;

export const normalizeAngle = (degrees: number): number => {
  let angle = degrees % 360;
  if (angle <= -180) {
    angle += 360;
  } else if (angle > 180) {
    angle -= 360;
  }
  return angle;
};

export const clampAngle = (degrees: number, min: number, max: number): number => {
  const angle = normalizeAngle(degrees);
  const normalizedMin = normalizeAngle(min);
  const normalizedMax = normalizeAngle(max);

  if (normalizedMin <= normalizedMax) {
    return clamp(angle, normalizedMin, normalizedMax);
  }

  if (angle >= normalizedMin || angle <= normalizedMax) {
    return angle;
  }

  const distanceToMin = Math.abs(normalizeAngle(angle - normalizedMin));
  const distanceToMax = Math.abs(normalizeAngle(normalizedMax - angle));
  return distanceToMin < distanceToMax ? normalizedMin : normalizedMax;
};

export const subtract = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x - b.x,
  y: a.y - b.y
});

export const add = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x + b.x,
  y: a.y + b.y
});

export const scale = (vector: Vec2, scalar: number): Vec2 => ({
  x: vector.x * scalar,
  y: vector.y * scalar
});

export const magnitude = (vector: Vec2): number => Math.hypot(vector.x, vector.y);

export const normalize = (vector: Vec2): Vec2 => {
  const length = magnitude(vector);
  return length === 0 ? { x: 1, y: 0 } : scale(vector, 1 / length);
};

const projectToConstraint = <T extends string>(
  parentPosition: Vec2,
  targetPosition: Vec2,
  constraint: JointConstraint<T>
): Vec2 => {
  if (constraint.length === 0) {
    return parentPosition;
  }

  const relativeTarget = subtract(targetPosition, parentPosition);
  const mag = magnitude(relativeTarget);

  if (mag === 0) {
    return add(parentPosition, { x: constraint.length, y: 0 });
  }

  const normalized = { x: relativeTarget.x / mag, y: relativeTarget.y / mag };
  const constrainedDirection = {
    x: normalized.x * constraint.length,
    y: normalized.y * constraint.length
  };

  return add(parentPosition, constrainedDirection);
};

// Front pose IK
const cloneFrontJoints = (joints: FrontJointStateMap): FrontJointStateMap => {
  const clone = {} as FrontJointStateMap;
  for (const joint of ALL_FRONT_JOINTS) {
    const { position } = joints[joint];
    clone[joint] = { position: { ...position } };
  }
  return clone;
};

const applyToFrontChildren = (
  joints: FrontJointStateMap,
  reference: FrontJointStateMap,
  joint: FrontJointName
) => {
  for (const child of FRONT_JOINT_CHILDREN[joint] ?? []) {
    const constraint = FRONT_JOINT_CONSTRAINTS[child];
    const parentPosition = joints[joint].position;
    const desiredPosition = reference[child]?.position ?? parentPosition;
    const projectedPosition = projectToConstraint(parentPosition, desiredPosition, constraint);
    joints[child] = { position: projectedPosition };
    applyToFrontChildren(joints, reference, child);
  }
};

export const moveFrontJointWithinConstraints = (
  joints: FrontJointStateMap,
  joint: FrontJointName,
  targetPosition: Vec2
): FrontJointStateMap => {
  const next = cloneFrontJoints(joints);
  const reference = cloneFrontJoints(joints);
  const constraint = FRONT_JOINT_CONSTRAINTS[joint];
  let resolvedPosition = targetPosition;

  if (constraint.parent) {
    const parentPosition = next[constraint.parent].position;
    resolvedPosition = projectToConstraint(parentPosition, targetPosition, constraint);
  }

  next[joint] = { position: resolvedPosition };
  applyToFrontChildren(next, reference, joint);
  return next;
};

export const moveMultipleFrontJoints = (
  joints: FrontJointStateMap,
  updates: Partial<Record<FrontJointName, Vec2>>
): FrontJointStateMap => {
  let next = joints;
  for (const [joint, position] of Object.entries(updates) as [FrontJointName, Vec2][]) {
    next = moveFrontJointWithinConstraints(next, joint, position);
  }
  return next;
};

// Side pose IK
const cloneSideJoints = (joints: SideJointStateMap): SideJointStateMap => {
  const clone = {} as SideJointStateMap;
  for (const joint of ALL_SIDE_JOINTS) {
    const { position } = joints[joint];
    clone[joint] = { position: { ...position } };
  }
  return clone;
};

const applyToSideChildren = (
  joints: SideJointStateMap,
  reference: SideJointStateMap,
  joint: SideJointName
) => {
  for (const child of SIDE_JOINT_CHILDREN[joint] ?? []) {
    const constraint = SIDE_JOINT_CONSTRAINTS[child];
    const parentPosition = joints[joint].position;
    const desiredPosition = reference[child]?.position ?? parentPosition;
    const projectedPosition = projectToConstraint(parentPosition, desiredPosition, constraint);
    joints[child] = { position: projectedPosition };
    applyToSideChildren(joints, reference, child);
  }
};

export const moveSideJointWithinConstraints = (
  joints: SideJointStateMap,
  joint: SideJointName,
  targetPosition: Vec2
): SideJointStateMap => {
  const next = cloneSideJoints(joints);
  const reference = cloneSideJoints(joints);
  const constraint = SIDE_JOINT_CONSTRAINTS[joint];
  let resolvedPosition = targetPosition;

  if (constraint.parent) {
    const parentPosition = next[constraint.parent].position;
    resolvedPosition = projectToConstraint(parentPosition, targetPosition, constraint);
  }

  next[joint] = { position: resolvedPosition };
  applyToSideChildren(next, reference, joint);
  return next;
};

export const moveMultipleSideJoints = (
  joints: SideJointStateMap,
  updates: Partial<Record<SideJointName, Vec2>>
): SideJointStateMap => {
  let next = joints;
  for (const [joint, position] of Object.entries(updates) as [SideJointName, Vec2][]) {
    next = moveSideJointWithinConstraints(next, joint, position);
  }
  return next;
};

// Generic functions that work with PoseModel
export const moveJointWithinConstraints = (
  pose: PoseModel,
  joint: string,
  targetPosition: Vec2
): PoseModel["joints"] => {
  if (isFrontPose(pose)) {
    return moveFrontJointWithinConstraints(pose.joints, joint as FrontJointName, targetPosition);
  } else {
    return moveSideJointWithinConstraints(pose.joints, joint as SideJointName, targetPosition);
  }
};

export const moveMultipleJoints = (
  pose: PoseModel,
  updates: Partial<Record<string, Vec2>>
): PoseModel["joints"] => {
  if (isFrontPose(pose)) {
    return moveMultipleFrontJoints(pose.joints, updates as Partial<Record<FrontJointName, Vec2>>);
  } else {
    return moveMultipleSideJoints(pose.joints, updates as Partial<Record<SideJointName, Vec2>>);
  }
};

// Legacy exports for backward compatibility
export const JOINT_CONSTRAINTS = FRONT_JOINT_CONSTRAINTS;
export const JOINT_CHILDREN = FRONT_JOINT_CHILDREN;
