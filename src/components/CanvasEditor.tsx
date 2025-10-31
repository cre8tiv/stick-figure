"use client";

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import { ALL_JOINTS, JointName, Limb, PoseModel, PoseView, Vec2 } from "@/models/pose";
import useFigureStore from "@/state/useFigureStore";
import { JOINT_CONSTRAINTS, magnitude, normalize } from "@/utils/kinematics";

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 480;
const UNIT_SCALE = 120;
const FIGURE_SPACING = 180;
const JOINT_RADIUS = 10;
const ROTATE_HANDLE_OFFSET = 24;

interface DragStateBase {
  figureId: string;
  poseId: string;
  figureIndex: number;
  pointerId: number;
}

interface JointDragState extends DragStateBase {
  type: "joint";
  joint: JointName;
}

interface LimbDragState extends DragStateBase {
  type: "limb";
  limb: Limb;
}

type DragState = JointDragState | LimbDragState;

const poseViewTransform = (view: PoseView, globalView: "2d" | "3d") => {
  if (view === "front") {
    return {
      forward: (point: Vec2): Vec2 => ({ ...point }),
      backward: (point: Vec2): Vec2 => ({ ...point })
    };
  }

  const depthBlend = globalView === "3d" ? 0.35 : 0;
  const xScale = 0.55;

  return {
    forward: (point: Vec2): Vec2 => ({
      x: point.x * xScale + point.y * depthBlend,
      y: point.y
    }),
    backward: (point: Vec2): Vec2 => ({
      x: (point.x - point.y * depthBlend) / xScale,
      y: point.y
    })
  };
};

const computeOrigins = (count: number): Vec2[] => {
  if (count === 0) {
    return [];
  }
  const center = CANVAS_WIDTH / 2;
  const start = center - ((count - 1) * FIGURE_SPACING) / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: start + index * FIGURE_SPACING,
    y: CANVAS_HEIGHT / 2 + 60
  }));
};

const CanvasEditor = memo(function CanvasEditor() {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const {
    figures,
    poses,
    ui,
    actions: {
      setActiveFigure,
      movePoseJoint,
      bringFigureForward,
      sendFigureBackward,
      bringFigureToFront,
      sendFigureToBack
    }
  } = useFigureStore((state) => ({
    figures: state.figures,
    poses: state.poses,
    ui: state.ui,
    actions: {
      setActiveFigure: state.actions.setActiveFigure,
      movePoseJoint: state.actions.movePoseJoint,
      bringFigureForward: state.actions.bringFigureForward,
      sendFigureBackward: state.actions.sendFigureBackward,
      bringFigureToFront: state.actions.bringFigureToFront,
      sendFigureToBack: state.actions.sendFigureToBack
    }
  }));

  const poseMap = useMemo(() => {
    const map = new Map<string, PoseModel>();
    for (const pose of poses) {
      map.set(pose.id, pose);
    }
    return map;
  }, [poses]);

  const origins = useMemo(() => computeOrigins(figures.length), [figures.length]);

  const figureEntries = useMemo(
    () =>
      figures
        .map((figure, index) => ({
          figure,
          pose: figure.poseId ? poseMap.get(figure.poseId) ?? null : null,
          index
        }))
        .filter((entry): entry is { figure: typeof figures[number]; pose: PoseModel; index: number } =>
          Boolean(entry.pose)
        ),
    [figures, poseMap]
  );

  const canvasToPoseSpace = useCallback(
    (canvasPoint: Vec2, pose: PoseModel, figureIndex: number): Vec2 => {
      const origin = origins[figureIndex];
      if (!origin) {
        return { ...canvasPoint };
      }
      const transform = poseViewTransform(pose.view, ui.viewMode);
      const relative = {
        x: (canvasPoint.x - origin.x) / UNIT_SCALE,
        y: (canvasPoint.y - origin.y) / UNIT_SCALE
      } satisfies Vec2;
      return transform.backward(relative);
    },
    [origins, ui.viewMode]
  );

  const poseToCanvasSpace = useCallback(
    (point: Vec2, pose: PoseModel, figureIndex: number): Vec2 => {
      const origin = origins[figureIndex];
      if (!origin) {
        return {
          x: point.x * UNIT_SCALE,
          y: point.y * UNIT_SCALE
        };
      }
      const transform = poseViewTransform(pose.view, ui.viewMode);
      const forward = transform.forward(point);
      return {
        x: origin.x + forward.x * UNIT_SCALE,
        y: origin.y + forward.y * UNIT_SCALE
      };
    },
    [origins, ui.viewMode]
  );

  const getSvgPoint = useCallback((event: PointerEvent): Vec2 | null => {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const inverted = svg.getScreenCTM()?.inverse();
    if (!inverted) {
      return null;
    }
    const transformed = point.matrixTransform(inverted);
    return { x: transformed.x, y: transformed.y };
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (!dragState) {
        return;
      }
      if (event.pointerId !== dragState.pointerId) {
        return;
      }
      const svgPoint = getSvgPoint(event.nativeEvent);
      if (!svgPoint) {
        return;
      }

      const entry = figureEntries.find(
        (item) => item.figure.id === dragState.figureId && item.index === dragState.figureIndex
      );
      if (!entry || !entry.pose) {
        return;
      }
      const posePoint = canvasToPoseSpace(svgPoint, entry.pose, entry.index);

      if (dragState.type === "joint") {
        movePoseJoint(dragState.poseId, dragState.joint, posePoint);
      } else {
        const parentPosition = entry.pose.joints[dragState.limb.from]?.position;
        if (!parentPosition) {
          return;
        }
        const direction = {
          x: posePoint.x - parentPosition.x,
          y: posePoint.y - parentPosition.y
        } satisfies Vec2;
        const length = magnitude(direction);
        const constraint = JOINT_CONSTRAINTS[dragState.limb.to];
        const targetDistance = constraint?.length ?? length;
        const normalized = length === 0 ? { x: 1, y: 0 } : normalize(direction);
        const constrained = {
          x: parentPosition.x + normalized.x * targetDistance,
          y: parentPosition.y + normalized.y * targetDistance
        } satisfies Vec2;
        movePoseJoint(dragState.poseId, dragState.limb.to, constrained);
      }
    },
    [canvasToPoseSpace, dragState, figureEntries, getSvgPoint, movePoseJoint]
  );

  const clearDragState = useCallback(() => {
    setDragState(null);
  }, []);

  const handleJointPointerDown = useCallback(
    (
      event: ReactPointerEvent,
      entry: (typeof figureEntries)[number],
      joint: JointName
    ) => {
      event.stopPropagation();
      event.preventDefault();
      setActiveFigure(entry.figure.id);
      const target = event.currentTarget as Element;
      target.setPointerCapture(event.pointerId);
      setDragState({
        type: "joint",
        figureId: entry.figure.id,
        poseId: entry.pose!.id,
        joint,
        figureIndex: entry.index,
        pointerId: event.pointerId
      });
    },
    [figureEntries, setActiveFigure]
  );

  const handleLimbPointerDown = useCallback(
    (
      event: ReactPointerEvent,
      entry: (typeof figureEntries)[number],
      limb: Limb
    ) => {
      event.stopPropagation();
      event.preventDefault();
      setActiveFigure(entry.figure.id);
      const target = event.currentTarget as Element;
      target.setPointerCapture(event.pointerId);
      setDragState({
        type: "limb",
        figureId: entry.figure.id,
        poseId: entry.pose!.id,
        limb,
        figureIndex: entry.index,
        pointerId: event.pointerId
      });
    },
    [figureEntries, setActiveFigure]
  );

  const renderLimb = useCallback(
    (entry: (typeof figureEntries)[number], limb: Limb) => {
      const { pose, index, figure } = entry;
      if (!pose) {
        return null;
      }
      const from = pose.joints[limb.from]?.position;
      const to = pose.joints[limb.to]?.position;
      if (!from || !to) {
        return null;
      }
      const start = poseToCanvasSpace(from, pose, index);
      const end = poseToCanvasSpace(to, pose, index);
      const mid = {
        x: (start.x + end.x) / 2,
        y: (start.y + end.y) / 2
      };
      const vector = {
        x: end.x - start.x,
        y: end.y - start.y
      };
      const length = Math.hypot(vector.x, vector.y) || 1;
      const normal = {
        x: (-vector.y / length) * ROTATE_HANDLE_OFFSET,
        y: (vector.x / length) * ROTATE_HANDLE_OFFSET
      };
      const handle = {
        x: mid.x + normal.x,
        y: mid.y + normal.y
      };
      const handleRadius = 8;
      const isActive = figure.id === ui.activeFigureId;
      return (
        <g key={`${figure.id}-${limb.name}`}>
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={figure.color}
            strokeWidth={isActive ? 6 : 4}
            strokeLinecap="round"
            style={{ cursor: "pointer" }}
            onPointerDown={(event) => handleLimbPointerDown(event, entry, limb)}
          />
          <circle
            cx={handle.x}
            cy={handle.y}
            r={handleRadius}
            fill={isActive ? figure.color : "#9ca3af"}
            stroke="#111827"
            strokeWidth={isActive ? 2 : 1}
            onPointerDown={(event) => handleLimbPointerDown(event, entry, limb)}
            style={{ cursor: "grab" }}
          />
        </g>
      );
    },
    [handleLimbPointerDown, poseToCanvasSpace, ui.activeFigureId]
  );

  const renderJointHandle = useCallback(
    (entry: (typeof figureEntries)[number], joint: JointName) => {
      const { pose, index, figure } = entry;
      if (!pose) {
        return null;
      }
      const position = pose.joints[joint]?.position;
      if (!position) {
        return null;
      }
      const canvasPosition = poseToCanvasSpace(position, pose, index);
      const isActive = figure.id === ui.activeFigureId;
      return (
        <circle
          key={`${figure.id}-joint-${joint}`}
          cx={canvasPosition.x}
          cy={canvasPosition.y}
          r={JOINT_RADIUS}
          fill={isActive ? "#ffffff" : "#f3f4f6"}
          stroke={figure.color}
          strokeWidth={isActive ? 4 : 2}
          onPointerDown={(event) => handleJointPointerDown(event, entry, joint)}
          style={{ cursor: "grab" }}
        />
      );
    },
    [handleJointPointerDown, poseToCanvasSpace, ui.activeFigureId]
  );

  const activeFigure = useMemo(
    () => figures.find((figure) => figure.id === ui.activeFigureId) ?? null,
    [figures, ui.activeFigureId]
  );

  return (
    <div style={{ display: "grid", gap: "0.75rem", width: "100%" }}>
      <header style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
        <h2 style={{ margin: 0 }}>Canvas</h2>
        <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Drag joints to reposition limbs or use limb handles to rotate them.
        </span>
      </header>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        width="100%"
        height={CANVAS_HEIGHT}
        style={{
          borderRadius: "0.75rem",
          border: "1px solid #d1d5db",
          backgroundColor: "rgba(255,255,255,0.65)",
          touchAction: "none"
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          if (dragState && event.pointerId === dragState.pointerId) {
            clearDragState();
          }
        }}
        onPointerLeave={(event) => {
          if (dragState && event.pointerId === dragState.pointerId) {
            clearDragState();
          }
        }}
      >
        {figureEntries.length === 0 ? (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#6b7280"
            fontSize={20}
          >
            Add a figure to begin posing.
          </text>
        ) : (
          figureEntries.map((entry) => {
            const { figure, pose, index } = entry;
            if (!pose) {
              return null;
            }
            const headPosition = pose.joints.head.position;
            const neckPosition = pose.joints.neck.position;
            const headCanvas = poseToCanvasSpace(headPosition, pose, index);
            const neckCanvas = poseToCanvasSpace(neckPosition, pose, index);
            const headRadius = Math.hypot(
              headCanvas.x - neckCanvas.x,
              headCanvas.y - neckCanvas.y
            );
            const isActive = ui.activeFigureId === figure.id;
            return (
              <g
                key={figure.id}
                onPointerDown={() => setActiveFigure(figure.id)}
                style={{ cursor: "pointer" }}
              >
                <circle
                  cx={headCanvas.x}
                  cy={headCanvas.y}
                  r={headRadius}
                  fill={isActive ? "rgba(255,255,255,0.9)" : "rgba(243,244,246,0.9)"}
                  stroke={figure.color}
                  strokeWidth={isActive ? 6 : 4}
                />
                {pose.limbs.map((limb) => renderLimb(entry, limb))}
                {ALL_JOINTS.map((joint) => renderJointHandle(entry, joint))}
              </g>
            );
          })
        )}
      </svg>

      {figureEntries.length > 0 && activeFigure && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexWrap: "wrap"
          }}
        >
          <strong>Selected figure:</strong>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              border: "1px solid #d1d5db",
              backgroundColor: "#f9fafb"
            }}
          >
            <span
              style={{
                width: "0.75rem",
                height: "0.75rem",
                borderRadius: "9999px",
                backgroundColor: activeFigure.color,
                display: "inline-block"
              }}
            />
            {activeFigure.label}
          </span>
          <div style={{ display: "inline-flex", gap: "0.5rem" }}>
            <button type="button" onClick={() => sendFigureToBack(activeFigure.id)}>
              Send to back
            </button>
            <button type="button" onClick={() => sendFigureBackward(activeFigure.id)}>
              Move backward
            </button>
            <button type="button" onClick={() => bringFigureForward(activeFigure.id)}>
              Move forward
            </button>
            <button type="button" onClick={() => bringFigureToFront(activeFigure.id)}>
              Bring to front
            </button>
          </div>
        </div>
      )}

      {figureEntries.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {figures.map((figure) => (
            <button
              key={figure.id}
              type="button"
              onClick={() => setActiveFigure(figure.id)}
              style={{
                padding: "0.5rem 0.75rem",
                borderRadius: "9999px",
                border:
                  figure.id === ui.activeFigureId
                    ? "2px solid #2563eb"
                    : "1px solid #d1d5db",
                backgroundColor: figure.id === ui.activeFigureId ? "#eff6ff" : "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem"
              }}
            >
              <span
                style={{
                  width: "0.65rem",
                  height: "0.65rem",
                  borderRadius: "9999px",
                  backgroundColor: figure.color,
                  display: "inline-block"
                }}
              />
              {figure.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export default CanvasEditor;
