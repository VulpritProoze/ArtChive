import React, { useState, useRef, useEffect } from "react";
import CanvasStage from "./canvas/canvas-stage";
import Toolbar from "./toolbar/toolbar";
import Sidebar from "./sidebar/sidebar";
import ExportModal from "./modals/export-modal";
import type { Shape, Layer, ProjectData } from "./types";

const GalleryIndex: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExportModalOpen, setExportModalOpen] = useState(false);
  const [stageWidth, setStageWidth] = useState(window.innerWidth);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      for(let entry of entries) {
        setStageWidth(entry.contentBoxSize[0].inlineSize)
      }
    })

    resizeObserver.observe(container)
    
    return () => {
      if(container) {
        resizeObserver.unobserve(container)
      }
    }
  }, [])

  const addShape = (type: "rect" | "circle") => {
    const newLayerId = `layer-${layers.length + 1}`;
    const newLayerName = `Layer ${layers.length + 1}`;
    const scrollTop = containerRef.current?.scrollTop || 0;
    const newShape: Shape = {
      id: `shape-${Date.now()}`,
      type,
      x: 100,
      y: scrollTop + 100,
      width: 100,
      height: 100,
      radius: type === "circle" ? 50 : undefined,
      fillEnabled: true,
      opacity: 1,
      fill: "#F1F1F1",
      stroke: "#3B3B3B",
      strokeWidth: 2,
      layerId: newLayerId,
      rotation: 0,
    };
    const newLayer: Layer = {
      id: newLayerId,
      name: newLayerName,
      shape: newShape,
    };
    setLayers([...layers, newLayer]);
  };

  const updateShape = (id: string, updates: Partial<Shape>) => {
    setLayers(
      layers.map((layer) =>
        layer.shape?.id === id
          ? { ...layer, shape: { ...layer.shape, ...updates } }
          : layer
      )
    );
  };

  const moveLayer = (layerId: string, direction: "up" | "down") => {
    const index = layers.findIndex((layer) => layer.id === layerId);
    if (direction === "up" && index > 0) {
      const newLayers = [...layers];
      [newLayers[index], newLayers[index - 1]] = [
        newLayers[index - 1],
        newLayers[index],
      ];
      setLayers(newLayers);
    } else if (direction === "down" && index < layers.length - 1) {
      const newLayers = [...layers];
      [newLayers[index], newLayers[index + 1]] = [
        newLayers[index + 1],
        newLayers[index],
      ];
      setLayers(newLayers);
    }
  };

  const saveProject = (): ProjectData => {
    return { layers };
  };

  const loadProject = (data: ProjectData) => {
    setLayers(data.layers);
  };

  return (
    <div className="grid grid-cols-14 relative h-screen w-screen">
      <div className="col-span-1 w-full h-screen z-20">
        <Toolbar
          addShape={addShape}
          onExport={() => setExportModalOpen(true)}
        />
      </div>
      <div ref={containerRef} className="col-span-11 relative w-full h-full z-10">
        <div className="absolute left-0 right-0 w-full h-full">
          <CanvasStage
            layers={layers}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            updateShape={updateShape}
            stageWidth={stageWidth}
          />
        </div>
      </div>
      <div className="col-span-2 w-full h-screen z-20">
        <Sidebar
          layers={layers}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          updateShape={updateShape}
          moveLayer={moveLayer}
        />
      </div>
      {isExportModalOpen && (
        <ExportModal
          projectData={saveProject()}
          onClose={() => setExportModalOpen(false)}
          onLoad={loadProject}
        />
      )}
    </div>
  );
};

export default GalleryIndex;
