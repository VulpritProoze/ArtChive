import { Type, Image, Undo2, Redo2, Grid, Magnet, Group as GroupIcon, Ungroup, MousePointer2, X, Move, Hand } from 'lucide-react';
import { useUploadImage } from './hooks/use-upload-image.hook';
import { toast } from 'react-toastify';

type EditorMode = 'pan' | 'move' | 'select';

interface ToolbarProps {
  onAddText: () => void;
  onAddImage: (url: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePreview: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onSetMode: (mode: EditorMode) => void;
  onDeselectAll: () => void;
  onOpenMenu: () => void;
  canGroup: boolean;
  canUngroup: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isPreviewMode: boolean;
  editorMode: EditorMode;
  gridEnabled: boolean;
  snapEnabled: boolean;
  hasSelection: boolean;
  hasUnsavedChanges: boolean;
}

export function Toolbar({
  onAddText,
  onAddImage,
  onUndo,
  onRedo,
  onTogglePreview,
  onToggleGrid,
  onToggleSnap,
  onGroup,
  onUngroup,
  onSetMode,
  onDeselectAll,
  onOpenMenu,
  canGroup,
  canUngroup,
  canUndo,
  canRedo,
  isPreviewMode,
  editorMode,
  gridEnabled,
  snapEnabled,
  hasSelection,
  hasUnsavedChanges,
}: ToolbarProps) {
  const { upload, isUploading, progress } = useUploadImage();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await upload(file);
      if (url) {
        onAddImage(url);
        toast.success('Image uploaded successfully!');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    }

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="bg-base-200 border-b border-base-300 p-3 flex items-center gap-2 flex-wrap">
      {/* Tool Modes */}
      <div className="flex gap-2 border-r border-base-300 pr-3">
        <button
          onClick={() => onSetMode('pan')}
          className={`btn btn-sm ${editorMode === 'pan' ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
          data-tip="Pan Tool (H)"
          disabled={isPreviewMode}
        >
          <Hand className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSetMode('move')}
          className={`btn btn-sm ${editorMode === 'move' ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
          data-tip="Move Tool (M)"
          disabled={isPreviewMode}
        >
          <Move className="w-4 h-4" />
        </button>
        <button
          onClick={() => onSetMode('select')}
          className={`btn btn-sm ${editorMode === 'select' ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
          data-tip="Selection Tool (V)"
          disabled={isPreviewMode}
        >
          <MousePointer2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDeselectAll}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Deselect All (Esc)"
          disabled={!hasSelection || isPreviewMode}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Add Content Section */}
      <div className="flex gap-2 border-r border-base-300 pr-3">
        <button
          onClick={onAddText}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Add Text"
          disabled={isPreviewMode}
        >
          <Type className="w-4 h-4" />
        </button>
        <label
          className={`btn btn-sm btn-ghost tooltip tooltip-bottom ${isUploading || isPreviewMode ? 'btn-disabled' : ''}`}
          data-tip="Upload Image"
        >
          <Image className="w-4 h-4" />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            disabled={isUploading || isPreviewMode}
          />
        </label>
        {isUploading && (
          <div className="flex items-center gap-2">
            <progress className="progress progress-primary w-20" value={progress} max="100"></progress>
            <span className="text-xs">{progress}%</span>
          </div>
        )}
      </div>

      {/* Group/Ungroup Section */}
      <div className="flex gap-2 border-r border-base-300 pr-3">
        <button
          onClick={onGroup}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Group Objects (Ctrl+G)"
          disabled={!canGroup || isPreviewMode}
        >
          <GroupIcon className="w-4 h-4" />
        </button>
        <button
          onClick={onUngroup}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Ungroup (Ctrl+Shift+G)"
          disabled={!canUngroup || isPreviewMode}
        >
          <Ungroup className="w-4 h-4" />
        </button>
      </div>

      {/* Undo/Redo Section */}
      <div className="flex gap-2 border-r border-base-300 pr-3">
        <button
          onClick={onUndo}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Undo (Ctrl+Z)"
          disabled={!canUndo || isPreviewMode}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={onRedo}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Redo (Ctrl+Y)"
          disabled={!canRedo || isPreviewMode}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* View Options */}
      <div className="flex gap-2 border-r border-base-300 pr-3">
        <button
          onClick={onToggleGrid}
          className={`btn btn-sm ${gridEnabled ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
          data-tip="Toggle Grid"
          disabled={isPreviewMode}
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={onToggleSnap}
          className={`btn btn-sm ${snapEnabled ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
          data-tip="Toggle Snapping"
          disabled={isPreviewMode}
        >
          <Magnet className="w-4 h-4" />
        </button>
      </div>

      {/* Unsaved Changes & Menu */}
      <div className="flex gap-2 ml-auto items-center">
        {hasUnsavedChanges && (
          <span className="text-xs text-warning font-medium">
            Unsaved changes
          </span>
        )}
        <button
          onClick={onOpenMenu}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Menu"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

    </div>
  );
}
