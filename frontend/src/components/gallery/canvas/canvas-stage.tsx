import React, { useState, useEffect, useRef } from "react";
import { Stage } from "react-konva";
import CanvasLayer from "./canvas-layer";
import type { Layer, Shape } from "../types";
import  Konva from 'konva'

interface CanvasStageProps {
  layers: Layer[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  stageWidth: number;
}

const CanvasStage: React.FC<CanvasStageProps> = ({
  layers,
  selectedId,
  setSelectedId,
  updateShape,
  stageWidth,
}) => {
  const [stageHeight, setStageHeight] = useState(window.innerHeight);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const gridSize = 20;

  // Update stage height based on shape positions
  useEffect(() => {
    const maxY = layers
      .flatMap((layer) => layer.shape)
      .reduce((max, shape) => {
        const bottom = shape.y + (shape.type === 'circle' ? (shape.radius || 50) : shape.height);
        return Math.max(max, bottom);
      }, 0);
    setStageHeight(Math.max(window.innerHeight, maxY + 200));
  }, [layers]);

  // Handle scroll to adjust stage height if near bottom
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollTop, clientHeight, scrollHeight } = containerRef.current;
      if (scrollTop + clientHeight > scrollHeight - 100) {
        setStageHeight((prev) => prev + 400);
      }
    }
  };

  // Update stage width and height on window resize
  useEffect(() => {
    const handleResize = () => {
      setStageHeight((prev) => Math.max(prev, window.innerHeight));
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-y-auto overflow-x-hidden"
      onScroll={handleScroll}
    >
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        draggable={false}
        onMouseDown={(e) => {
          if (e.target === e.target.getStage()) {
            setSelectedId(null);
          }
        }}
      >
        <CanvasLayer
          layers={layers}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          updateShape={updateShape}
          gridSize={gridSize}
          stageHeight={stageHeight}
          stageWidth={stageWidth}
          stageRef={stageRef}
        />
      </Stage>
    </div>
  );
};

export default CanvasStage;