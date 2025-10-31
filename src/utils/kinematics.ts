import {
  ALL_JOINTS,
  DEFAULT_POSE,
  JointName,
  JointState,
  JointStateMap,
  Vec2
} from "@/models/pose";

export interface JointConstraint {
  parent: JointName | null;
  length: number;
  minAngle?: number;
  maxAngle?: number;
}

export type JointConstraintMap = Record<JointName, JointConstraint>;

const defaultPositions = DEFAULT_POSE.joints;

const distance = (a: Vec2, b: Vec2): number =>
  Math.hypot(b.x - a.x, b.y - a.y);

const constraintLength = (parent: JointName | null, joint: JointName): number => {
  if (!parent) {
    return 0;
  }
  return distance(defaultPositions[parent].position, defaultPositions[joint].position);
};

export const JOINT_CONSTRAINTS: JointConstraintMap = {
  pelvis: {
    parent: null,
    length: 0
  },
  chest: {
    parent: "pelvis",
    length: constraintLength("pelvis", "chest"),
    minAngle: -150,
    maxAngle: -30
  },
  neck: {
    parent: "chest",
    length: constraintLength("chest", "neck"),
    minAngle: -150,
    maxAngle: -30
  },
  head: {
    parent: "neck",
    length: constraintLength("neck", "head"),
    minAngle: -140,
    maxAngle: -40
  },
  leftShoulder: {
    parent: "chest",
    length: constraintLength("chest", "leftShoulder"),
    minAngle: 120,
    maxAngle: 220
  },
  leftElbow: {
    parent: "leftShoulder",
    length: constraintLength("leftShoulder", "leftElbow"),
    minAngle: 40,
    maxAngle: 180
  },
  leftWrist: {
    parent: "leftElbow",
    length: constraintLength("leftElbow", "leftWrist"),
    minAngle: 10,
    maxAngle: 190
  },
  rightShoulder: {
    parent: "chest",
    length: constraintLength("chest", "rightShoulder"),
    minAngle: -40,
    maxAngle: 60
  },
  rightElbow: {
    parent: "rightShoulder",
    length: constraintLength("rightShoulder", "rightElbow"),
    minAngle: -10,
    maxAngle: 140
  },
  rightWrist: {
    parent: "rightElbow",
    length: constraintLength("rightElbow", "rightWrist"),
    minAngle: -100,
    maxAngle: 100
  },
  leftHip: {
    parent: "pelvis",
    length: constraintLength("pelvis", "leftHip"),
    minAngle: 150,
    maxAngle: 210
  },
  leftKnee: {
    parent: "leftHip",
    length: constraintLength("leftHip", "leftKnee"),
    minAngle: 70,
    maxAngle: 180
  },
  leftAnkle: {
    parent: "leftKnee",
    length: constraintLength("leftKnee", "leftAnkle"),
    minAngle: 70,
    maxAngle: 180
  },
  rightHip: {
    parent: "pelvis",
    length: constraintLength("pelvis", "rightHip"),
    minAngle: -30,
    maxAngle: 30
  },
  rightKnee: {
    parent: "rightHip",
    length: constraintLength("rightHip", "rightKnee"),
    minAngle: 0,
    maxAngle: 110
  },
  rightAnkle: {
    parent: "rightKnee",
    length: constraintLength("rightKnee", "rightAnkle"),
    minAngle: -10,
    maxAngle: 110
  }
};

export const JOINT_CHILDREN: Record<JointName, JointName[]> = ALL_JOINTS.reduce(
  (children, joint) => {
    children[joint] = [];
    return children;
  },
  {} as Record<JointName, JointName[]>
);

for (const [joint, constraint] of Object.entries(JOINT_CONSTRAINTS) as [
  JointName,
  JointConstraint
][]) {
  if (constraint.parent) {
    JOINT_CHILDREN[constraint.parent].push(joint);
  }
}

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

const projectToConstraint = (
  parentPosition: Vec2,
  targetPosition: Vec2,
  constraint: JointConstraint
): Vec2 => {
  if (constraint.length === 0) {
    return parentPosition;
  }

  const relativeTarget = subtract(targetPosition, parentPosition);
  let direction = relativeTarget;
  if (magnitude(relativeTarget) === 0) {
    direction = { x: constraint.length, y: 0 };
  }

  let angle = radToDeg(Math.atan2(direction.y, direction.x));

  if (constraint.minAngle !== undefined && constraint.maxAngle !== undefined) {
    angle = clampAngle(angle, constraint.minAngle, constraint.maxAngle);
  }

  const constrainedDirection = {
    x: Math.cos(degToRad(angle)) * constraint.length,
    y: Math.sin(degToRad(angle)) * constraint.length
  };

  return add(parentPosition, constrainedDirection);
};

const cloneJointState = (joints: JointStateMap): JointStateMap => {
  const clone = {} as JointStateMap;
  for (const joint of ALL_JOINTS) {
    const { position } = joints[joint];
    clone[joint] = { position: { ...position } } satisfies JointState;
  }
  return clone;
};

const applyToChildren = (
  joints: JointStateMap,
  reference: JointStateMap,
  joint: JointName
) => {
  for (const child of JOINT_CHILDREN[joint] ?? []) {
    const constraint = JOINT_CONSTRAINTS[child];
    const parentPosition = joints[joint].position;
    const desiredPosition = reference[child]?.position ?? parentPosition;
    const projectedPosition = projectToConstraint(parentPosition, desiredPosition, constraint);
    joints[child] = { position: projectedPosition };
    applyToChildren(joints, reference, child);
  }
};

export const moveJointWithinConstraints = (
  joints: JointStateMap,
  joint: JointName,
  targetPosition: Vec2
): JointStateMap => {
  const next = cloneJointState(joints);
  const reference = cloneJointState(joints);
  const constraint = JOINT_CONSTRAINTS[joint];
  let resolvedPosition = targetPosition;

  if (constraint.parent) {
    const parentPosition = next[constraint.parent].position;
    resolvedPosition = projectToConstraint(parentPosition, targetPosition, constraint);
  }

  next[joint] = { position: resolvedPosition };
  applyToChildren(next, reference, joint);
  return next;
};

export const moveMultipleJoints = (
  joints: JointStateMap,
  updates: Partial<Record<JointName, Vec2>>
): JointStateMap => {
  let next = joints;
  for (const [joint, position] of Object.entries(updates) as [JointName, Vec2][]) {
    next = moveJointWithinConstraints(next, joint, position);
  }
  return next;
};
