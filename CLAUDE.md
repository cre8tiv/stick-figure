# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server (localhost:3000)
npm run dev

# Build production bundle
npm run build

# Start production server (after build)
npm run start

# Run ESLint
npm run lint
```

## Project Overview

Stick Figure Studio is a Next.js 14 web application for creating and posing stylized stick figures. Users can create multiple figures, adjust their poses by dragging joints and limbs, customize appearance, and export artwork as SVG or PNG.

## Technology Stack

- **Framework**: Next.js 14 (App Router)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **Language**: TypeScript (strict mode)

## Architecture

### Core Concepts

The application separates **Figures** (visual instances) from **Poses** (skeletal configurations):

- **Figure**: A visual representation with color, position, rotation, and reference to a pose. Multiple figures can share the same pose.
- **Pose**: A skeletal configuration defining joint positions, limbs, gender (body type), and view (front/side). Each figure has its own independent pose for manipulation.

### State Management ([src/state/useFigureStore.ts](src/state/useFigureStore.ts))

Zustand store manages all application state:
- `figures[]`: Array of figure instances
- `poses[]`: Array of pose configurations
- `ui`: UI state (active figure, grid visibility, view mode, zoom)
- `actions`: Methods for manipulating figures and poses

**Important**: When poses are cloned (e.g., when adding a figure), use `clonePose()` and `cloneJoints()` to create deep copies, ensuring figures maintain independent poses.

### Pose System ([src/models/pose.ts](src/models/pose.ts))

- **Joints**: 16 anatomical points (pelvis, chest, neck, head, shoulders, elbows, wrists, hips, knees, ankles)
- **Limbs**: Connections between joints (spine, arms, legs, etc.)
- **Gender**: Affects body rendering (female poses use curved torso, ponytail)
- **View**: Front or side view with different perspective transforms

### Kinematics ([src/utils/kinematics.ts](src/utils/kinematics.ts))

Implements inverse kinematics with hierarchical constraints:

1. **Constraint System**: Each joint (except pelvis) has a parent joint and fixed length
2. **Movement**: When a joint moves, it's projected to maintain distance from parent
3. **Propagation**: Child joints automatically adjust to maintain their constraints
4. **Hierarchy**: Pelvis is root → chest → shoulders/hips → elbows/knees → wrists/ankles

Key functions:
- `moveJointWithinConstraints()`: Move a single joint respecting constraints
- `moveMultipleJoints()`: Move multiple joints sequentially
- `JOINT_CONSTRAINTS`: Defines parent-child relationships and lengths

### Component Structure

- **[src/app/page.tsx](src/app/page.tsx)**: Main layout with Toolbar + CanvasEditor
- **[src/components/Toolbar.tsx](src/components/Toolbar.tsx)**: Left sidebar with all controls (figure management, appearance, pose settings, transforms)
- **[src/components/CanvasEditor.tsx](src/components/CanvasEditor.tsx)**: SVG canvas for rendering and manipulating figures
- **[src/components/ColorPicker.tsx](src/components/ColorPicker.tsx)**: Color selection component

### Canvas Coordinate Systems

The canvas uses multiple coordinate systems:

1. **Canvas Space**: SVG viewport coordinates (720×600)
2. **Pose Space**: Normalized coordinates centered on figure origin, scaled by UNIT_SCALE (120)
3. **Figure Transforms**: Position offset and rotation applied to entire figure

Coordinate conversion functions in CanvasEditor:
- `canvasToPoseSpace()`: Convert canvas click → pose joint position
- `poseToCanvasSpace()`: Convert pose joint → canvas rendering position
- `poseViewTransform()`: Apply front/side view perspective

### Rendering

- **Limbs**: Rendered as SVG lines (or curved paths for female torso)
- **Joints**: Circles with drag handles for manipulation
- **Head**: Circle sized relative to neck-head distance, with ponytail for female poses
- **Handles**: Rotation handles positioned perpendicular to limb midpoints
- **Export**: `data-export="ignore"` attribute hides editing handles from exported SVG/PNG

### Drag Interaction

Two drag types:
1. **Joint Drag**: Drags a specific joint, applying IK constraints
2. **Limb Drag**: Drags via rotation handle, constraining to fixed limb length

## Path Aliases

`@/*` maps to `./src/*` (configured in [tsconfig.json](tsconfig.json))

## Code Style

- TypeScript strict mode enabled
- Use functional components with hooks
- Prefer `const` over `let`
- Use type inference where possible, explicit types for function parameters/returns
- Component props use inline interface definitions or separate interface declarations
