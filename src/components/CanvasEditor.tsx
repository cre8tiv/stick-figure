"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

import {
  PoseModel,
  PoseView,
  Vec2,
  isFrontPose,
  isSidePose,
  FrontJointName,
  SideJointName,
  FrontLimb,
  SideLimb,
  ALL_FRONT_JOINTS,
  ALL_SIDE_JOINTS
} from "@/models/pose";
import useFigureStore, { type Figure } from "@/state/useFigureStore";
import {
  FRONT_JOINT_CONSTRAINTS,
  SIDE_JOINT_CONSTRAINTS,
  magnitude,
  normalize
} from "@/utils/kinematics";

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 600;
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
  joint: string;
}

interface LimbDragState extends DragStateBase {
  type: "limb";
  limb: FrontLimb | SideLimb;
}

type DragState = JointDragState | LimbDragState;

type FigureEntry = {
  figure: Figure;
  pose: PoseModel;
  index: number;
};

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
  const [exportFeedback, setExportFeedback] = useState<
    | {
        type: "success" | "error";
        message: string;
      }
    | null
  >(null);
  const [zoom, setZoom] = useState(1);

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
      sendFigureToBack,
      updateFigure
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
      sendFigureToBack: state.actions.sendFigureToBack,
      updateFigure: state.actions.updateFigure
    }
  }));

  useEffect(() => {
    if (!exportFeedback) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setExportFeedback(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [exportFeedback]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "=") {
        event.preventDefault();
        setZoom((z) => Math.min(4, z + 0.25));
      } else if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        setZoom((z) => Math.max(0.25, z - 0.25));
      } else if ((event.ctrlKey || event.metaKey) && event.key === "0") {
        event.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const poseMap = useMemo(() => {
    const map = new Map<string, PoseModel>();
    for (const pose of poses) {
      map.set(pose.id, pose);
    }
    return map;
  }, [poses]);

  const figureMap = useMemo(() => {
    const map = new Map<number, Figure>();
    figures.forEach((figure, index) => {
      map.set(index, figure);
    });
    return map;
  }, [figures]);

  const origins = useMemo(() => computeOrigins(figures.length), [figures.length]);

  const figureEntries = useMemo<FigureEntry[]>(
    () =>
      figures
        .map((figure, index) => {
          const pose = figure.poseId ? poseMap.get(figure.poseId) ?? null : null;
          if (!pose) {
            return null;
          }
          return { figure, pose, index } satisfies FigureEntry;
        })
        .filter((entry): entry is FigureEntry => Boolean(entry)),
    [figures, poseMap]
  );

  const canvasToPoseSpace = useCallback(
    (canvasPoint: Vec2, pose: PoseModel, figureIndex: number): Vec2 => {
      const origin = origins[figureIndex];
      if (!origin) {
        return { ...canvasPoint };
      }
      
      // Reverse figure-level transforms first
      let x = canvasPoint.x;
      let y = canvasPoint.y;
      const figure = figureMap.get(figureIndex);
      if (figure) {
        const figurePosition = figure.position || { x: 0, y: 0 };
        const figureRotation = figure.rotation || 0;
        
        // Reverse translation
        x -= figurePosition.x;
        y -= figurePosition.y;
        
        // Reverse rotation around the origin
        const dx = x - origin.x;
        const dy = y - origin.y;
        const cos = Math.cos(-figureRotation);
        const sin = Math.sin(-figureRotation);
        x = origin.x + (dx * cos - dy * sin);
        y = origin.y + (dx * sin + dy * cos);
      }
      
      const transform = poseViewTransform(pose.view, ui.viewMode);
      const relative = {
        x: (x - origin.x) / UNIT_SCALE,
        y: (y - origin.y) / UNIT_SCALE
      } satisfies Vec2;
      return transform.backward(relative);
    },
    [origins, ui.viewMode, figureMap]
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
      let x = origin.x + forward.x * UNIT_SCALE;
      let y = origin.y + forward.y * UNIT_SCALE;
      
      // Apply figure-level transforms
      const figure = figureMap.get(figureIndex);
      if (figure) {
        const figurePosition = figure.position || { x: 0, y: 0 };
        const figureRotation = figure.rotation || 0;
        
        // Apply rotation around the origin
        const dx = x - origin.x;
        const dy = y - origin.y;
        const cos = Math.cos(figureRotation);
        const sin = Math.sin(figureRotation);
        x = origin.x + (dx * cos - dy * sin);
        y = origin.y + (dx * sin + dy * cos);
        
        // Apply translation
        x += figurePosition.x;
        y += figurePosition.y;
      }
      
      return { x, y };
    },
    [origins, ui.viewMode, figureMap]
  );

  const downloadFromUrl = useCallback((href: string, filename: string) => {
    const link = document.createElement("a");
    link.href = href;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const createExportSvg = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", `${CANVAS_WIDTH}`);
    clone.setAttribute("height", `${CANVAS_HEIGHT}`);

    clone
      .querySelectorAll('[data-export="ignore"]')
      .forEach((node) => node.parentElement?.removeChild(node));

    return clone;
  }, []);

  const handleExportSvg = useCallback(() => {
    const exportSvg = createExportSvg();
    if (!exportSvg) {
      setExportFeedback({
        type: "error",
        message: "Unable to export: canvas is not ready."
      });
      return;
    }

    try {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(exportSvg);
      const blob = new Blob(["<?xml version=\"1.0\" standalone=\"no\"?>\n", source], {
        type: "image/svg+xml;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);
      downloadFromUrl(url, "stick-figures.svg");
      URL.revokeObjectURL(url);
      setExportFeedback({
        type: "success",
        message: "SVG downloaded successfully."
      });
    } catch (error) {
      console.error(error);
      setExportFeedback({
        type: "error",
        message: "Failed to export SVG."
      });
    }
  }, [createExportSvg, downloadFromUrl]);

  const handleExportPng = useCallback(async () => {
    const exportSvg = createExportSvg();
    if (!exportSvg) {
      setExportFeedback({
        type: "error",
        message: "Unable to export: canvas is not ready."
      });
      return;
    }

    let objectUrl: string | null = null;
    try {
      const serializer = new XMLSerializer();
      const source = serializer.serializeToString(exportSvg);
      const blob = new Blob(["<?xml version=\"1.0\" standalone=\"no\"?>\n", source], {
        type: "image/svg+xml;charset=utf-8"
      });
      objectUrl = URL.createObjectURL(blob);

      await new Promise<void>((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = CANVAS_WIDTH;
          canvas.height = CANVAS_HEIGHT;
          const context = canvas.getContext("2d");
          if (!context) {
            reject(new Error("Unable to access 2D context"));
            return;
          }
          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0);
          const pngUrl = canvas.toDataURL("image/png");
          downloadFromUrl(pngUrl, "stick-figures.png");
          resolve();
        };
        image.onerror = () => reject(new Error("Unable to render SVG to image"));
        image.src = objectUrl!;
      });

      setExportFeedback({
        type: "success",
        message: "PNG downloaded successfully."
      });
    } catch (error) {
      console.error(error);
      setExportFeedback({
        type: "error",
        message: "Failed to export PNG."
      });
    } finally {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    }
  }, [createExportSvg, downloadFromUrl]);

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
        const pose = entry.pose;
        if (!pose) {
          return;
        }

        let parentPosition: Vec2 | undefined;
        let constraintLength: number | undefined;

        if (isFrontPose(pose)) {
          const limb = dragState.limb as FrontLimb;
          parentPosition = pose.joints[limb.from]?.position;
          constraintLength = FRONT_JOINT_CONSTRAINTS[limb.to]?.length;
        } else {
          const limb = dragState.limb as SideLimb;
          parentPosition = pose.joints[limb.from]?.position;
          constraintLength = SIDE_JOINT_CONSTRAINTS[limb.to]?.length;
        }

        if (!parentPosition) {
          return;
        }

        const direction = {
          x: posePoint.x - parentPosition.x,
          y: posePoint.y - parentPosition.y
        } satisfies Vec2;
        const length = magnitude(direction);
        const targetDistance = constraintLength ?? length;
        const normalized = length === 0 ? { x: 1, y: 0 } : normalize(direction);
        const constrained = {
          x: parentPosition.x + normalized.x * targetDistance,
          y: parentPosition.y + normalized.y * targetDistance
        } satisfies Vec2;
        movePoseJoint(dragState.poseId, dragState.limb.to as string, constrained);
      }
    },
    [canvasToPoseSpace, dragState, figureEntries, getSvgPoint, movePoseJoint, updateFigure]
  );

  const clearDragState = useCallback(() => {
    setDragState(null);
  }, []);

  const handleJointPointerDown = useCallback(
    (event: ReactPointerEvent, entry: FigureEntry, joint: string) => {
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
    [setActiveFigure]
  );

  const handleLimbPointerDown = useCallback(
    (event: ReactPointerEvent, entry: FigureEntry, limb: FrontLimb | SideLimb) => {
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
    [setActiveFigure]
  );

  const renderLimb = useCallback(
    (entry: FigureEntry, limb: FrontLimb | SideLimb) => {
      const { pose, index, figure } = entry;
      if (!pose) {
        return null;
      }

      let from: Vec2 | undefined;
      let to: Vec2 | undefined;

      if (isFrontPose(pose)) {
        const frontLimb = limb as FrontLimb;
        from = pose.joints[frontLimb.from]?.position;
        to = pose.joints[frontLimb.to]?.position;
      } else {
        const sideLimb = limb as SideLimb;
        from = pose.joints[sideLimb.from]?.position;
        to = pose.joints[sideLimb.to]?.position;
      }

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
      
      // Determine if this is a body part (torso) or limb
      const bodyParts = ["spine", "neck", "leftSide", "rightSide", "leftHip", "rightHip", "hip"];
      const isBodyPart = bodyParts.includes(limb.name);

      // Get width from figure settings, with defaults
      const baseWidth = isBodyPart
        ? (figure.bodyWidth || (isActive ? 6 : 4))
        : (figure.limbWidth || (isActive ? 6 : 4));

      // Determine if we should use curved rendering
      const shouldCurve = pose.gender === "female" && isFrontPose(pose) && (
        limb.name === "spine" || limb.name === "leftSide" || limb.name === "rightSide"
      );
      
      const pointerProps = {
        style: { cursor: "pointer" },
        onPointerDown: (event: ReactPointerEvent) => handleLimbPointerDown(event, entry, limb)
      };

      let limbElement;
      if (shouldCurve) {
        // Front view: straight spine with curved sides
        const thickness = baseWidth;
        if (limb.name === "spine") {
          limbElement = (
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke={figure.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              fill="none"
              {...pointerProps}
            />
          );
        } else {
          // Curved sides for waist
          const controlX = (start.x + end.x) / 2;
          const controlY = (start.y + end.y) / 2 + (end.y < start.y ? 15 : -15);
          limbElement = (
            <path
              d={`M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`}
              stroke={figure.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              fill="none"
              {...pointerProps}
            />
          );
        }
      } else if (isSidePose(pose) && pose.gender === "female" && limb.name === "spine") {
        // Side view female: curved spine
        const thickness = baseWidth;
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const controlX = start.x + dx * 0.5 + 20; // Curve forward
        const controlY = start.y + dy * 0.5;
        limbElement = (
          <path
            d={`M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x} ${end.y}`}
            stroke={figure.color}
            strokeWidth={thickness}
            strokeLinecap="round"
            fill="none"
            {...pointerProps}
          />
        );
      } else {
        // Default straight line rendering
        limbElement = (
          <line
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            stroke={figure.color}
            strokeWidth={baseWidth}
            strokeLinecap="round"
            fill="none"
            {...pointerProps}
          />
        );
      }
      
      return (
        <g key={`${figure.id}-${limb.name}`}>
          {limbElement}
          <circle
            cx={handle.x}
            cy={handle.y}
            r={handleRadius}
            fill={isActive ? figure.color : "#9ca3af"}
            stroke="#111827"
            strokeWidth={isActive ? 2 : 1}
            onPointerDown={(event) => handleLimbPointerDown(event, entry, limb)}
            style={{ cursor: "grab" }}
            data-export="ignore"
          />
        </g>
      );
    },
    [handleLimbPointerDown, poseToCanvasSpace, ui.activeFigureId]
  );

  const renderJointHandle = useCallback(
    (entry: FigureEntry, joint: string) => {
      const { pose, index, figure } = entry;
      if (!pose) {
        return null;
      }

      let position: Vec2 | undefined;
      if (isFrontPose(pose)) {
        position = pose.joints[joint as FrontJointName]?.position;
      } else {
        position = pose.joints[joint as SideJointName]?.position;
      }

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
          data-export="ignore"
        />
      );
    },
    [handleJointPointerDown, poseToCanvasSpace, ui.activeFigureId]
  );

  const activeFigure = useMemo(
    () => figures.find((figure) => figure.id === ui.activeFigureId) ?? null,
    [figures, ui.activeFigureId]
  );

  const gridBackground =
    "linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(180deg, rgba(0,0,0,0.08) 1px, transparent 1px)";

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Canvas</h2>
          <p className="text-sm text-gray-600">
            Drag joints to reposition limbs or use limb handles to rotate them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
            <button
              onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              aria-label="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[3.5rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(4, z + 0.25))}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              aria-label="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <button
              onClick={() => setZoom(1)}
              className="px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
              title="Reset zoom"
            >
              Reset
            </button>
          </div>
          {exportFeedback && (
            <span
              className={`text-sm font-medium ${
                exportFeedback.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {exportFeedback.message}
            </span>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleExportPng}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Export PNG
            </button>
            <button
              onClick={handleExportSvg}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              Export SVG
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="w-full h-full rounded-xl border border-gray-300 shadow-lg touch-none bg-white/80"
          style={{
            backgroundImage: ui.showGrid ? gridBackground : undefined,
            backgroundSize: `${24 / zoom}px ${24 / zoom}px`
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
          <g transform={`translate(${CANVAS_WIDTH/2}, ${CANVAS_HEIGHT/2}) scale(${zoom}) translate(-${CANVAS_WIDTH/2}, -${CANVAS_HEIGHT/2})`}>
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

                let headPosition: Vec2;
                let neckPosition: Vec2;

                if (isFrontPose(pose)) {
                  headPosition = pose.joints.head.position;
                  neckPosition = pose.joints.neck.position;
                } else {
                  headPosition = pose.joints.head.position;
                  neckPosition = pose.joints.neck.position;
                }
                const headCanvas = poseToCanvasSpace(headPosition, pose, index);
                const neckCanvas = poseToCanvasSpace(neckPosition, pose, index);
                // Calculate head radius from pose space to avoid scaling with figure rotation
                const baseHeadRadius = Math.hypot(
                  headPosition.x - neckPosition.x,
                  headPosition.y - neckPosition.y
                ) * UNIT_SCALE;
                const headRadius = baseHeadRadius * (figure.headSize || 1);
                const isActive = ui.activeFigureId === figure.id;
                
                // Render female hair/ponytail if needed
                const renderHair = () => {
                  if (pose.gender !== "female") return null;

                  if (isFrontPose(pose)) {
                    // Front view ponytail on the left side
                    const ponytailStart = { x: headCanvas.x - headRadius * 0.7, y: headCanvas.y - headRadius * 0.5 };
                    const ponytailMid = { x: headCanvas.x - headRadius * 0.5, y: headCanvas.y + headRadius * 0.3 };
                    const ponytailEnd = { x: headCanvas.x - headRadius * 1.2, y: headCanvas.y + headRadius * 0.8 };
                    return (
                      <path
                        d={`M ${ponytailStart.x} ${ponytailStart.y} Q ${ponytailMid.x} ${ponytailMid.y} ${ponytailEnd.x} ${ponytailEnd.y}`}
                        stroke={figure.color}
                        strokeWidth={isActive ? 6 : 4}
                        strokeLinecap="round"
                        fill="none"
                      />
                    );
                  } else if (isSidePose(pose)) {
                    // Side view ponytail is a limb, rendered separately
                    return null;
                  }
                  return null;
                };
                
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
                      fill={figure.color}
                      stroke={figure.color}
                      strokeWidth={isActive ? 6 : 4}
                    />
                    {renderHair()}
                    {pose.limbs.map((limb) => renderLimb(entry, limb))}
                    {isFrontPose(pose) && ALL_FRONT_JOINTS.map((joint) => renderJointHandle(entry, joint))}
                    {isSidePose(pose) && ALL_SIDE_JOINTS.map((joint) => renderJointHandle(entry, joint))}
                  </g>
                );
              })
            )}
          </g>
        </svg>
      </div>
    </div>
  );
});

export default CanvasEditor;
