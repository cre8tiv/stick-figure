"use client";

import { Toolbar, CanvasEditor } from "@/components";

export default function HomePage() {
  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <Toolbar />
      <div className="flex-1 ml-[320px] h-full">
        <CanvasEditor />
      </div>
    </div>
  );
}
