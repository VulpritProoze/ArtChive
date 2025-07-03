import React from 'react';
import ToolButton from './toolbutton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSquare, faCircle, faDownload } from '@fortawesome/free-solid-svg-icons';

interface ToolbarProps {
  addShape: (type: 'rect' | 'circle') => void;
  onExport: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ addShape, onExport }) => {
  return (
    <div className="w-full bg-gray-800 text-white p-2 flex flex-col gap-2 h-screen z-10">
      <ToolButton
        icon={<FontAwesomeIcon icon={faSquare} />}
        onClick={() => addShape('rect')}
        tooltip="Add Rectangle"
      />
      <ToolButton
        icon={<FontAwesomeIcon icon={faCircle} />}
        onClick={() => addShape('circle')}
        tooltip="Add Circle"
      />
      <ToolButton
        icon={<FontAwesomeIcon icon={faDownload} />}
        onClick={onExport}
        tooltip="Export Project"
      />
    </div>
  );
};

export default Toolbar;