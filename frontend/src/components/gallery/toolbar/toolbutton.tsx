import React from 'react';

interface ToolButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  tooltip: string;
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, onClick, tooltip }) => {
  return (
    <div className="relative group">
      <button
        className="btn btn-sm btn-ghost text-white hover:bg-gray-600 w-full"
        onClick={onClick}
      >
        {icon}
      </button>
      <div className="absolute left-full top-0 ml-2 hidden group-hover:block bg-gray-700 text-white text-xs rounded p-1">
        {tooltip}
      </div>
    </div>
  );
};

export default ToolButton;