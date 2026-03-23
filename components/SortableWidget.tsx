"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripHorizontal } from "lucide-react";

interface SortableWidgetProps {
  id: string;
  className?: string;
  children: React.ReactNode;
}

export function SortableWidget({ id, className = "", children }: SortableWidgetProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group/widget ${className} ${isDragging ? "opacity-50 scale-105 shadow-2xl" : ""}`}
    >
      {/* Drag Handle */}
      <div 
        {...attributes} 
        {...listeners}
        className="absolute top-4 right-4 z-50 p-2 opacity-0 group-hover/widget:opacity-100 cursor-grab hover:bg-white/10 rounded-lg transition-all active:cursor-grabbing text-zinc-500 hover:text-white"
        title="Drag to reorder"
      >
        <GripHorizontal className="w-4 h-4" />
      </div>
      
      {children}
    </div>
  );
}
