import React, { useState, useRef } from 'react';
import type { ProjectData } from '../types';

interface ExportModalProps {
  projectData: ProjectData;
  onClose: () => void;
  onLoad: (data: ProjectData) => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ projectData, onClose, onLoad }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = JSON.stringify(projectData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data: ProjectData = JSON.parse(event.target?.result as string);
          onLoad(data);
          onClose();
        } catch (e) {
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-30">
      <div className="bg-white p-6 rounded-lg w-96">
        <h2 className="text-xl font-bold mb-4">Export / Import Project</h2>
        <button
          onClick={handleExport}
          className="btn btn-primary w-full mb-2"
        >
          Export Project
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          className="hidden"
          onChange={handleFileChange}
      />
        <button
          onClick={handleImport}
          className="btn w-full btn-secondary mb-2"
        >
          Import
        </button>
        <button
          onClick={onClose}
          className="btn flex justify-self-end btn-ghost"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ExportModal;