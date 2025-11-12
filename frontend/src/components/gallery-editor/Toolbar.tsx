import { Square, Circle, Type, Image, Minus, Undo2, Redo2, Save, Eye, Grid, Magnet, Group as GroupIcon, Ungroup, MousePointer2, X } from 'lucide-react';
import { useUploadImage } from '@/hooks/useUploadImage';
import { toast } from 'react-toastify';

interface ToolbarProps {
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddText: () => void;
  onAddLine: () => void;
  onAddImage: (url: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onTogglePreview: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onToggleSelectMode: () => void;
  onDeselectAll: () => void;
  canGroup: boolean;
  canUngroup: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isSaving: boolean;
  isPreviewMode: boolean;
  isSelectMode: boolean;
  gridEnabled: boolean;
  snapEnabled: boolean;
  hasSelection: boolean;
  lastSaved?: Date | null;
}

export function Toolbar({
  onAddRect,
  onAddCircle,
  onAddText,
  onAddLine,
  onAddImage,
  onUndo,
  onRedo,
  onSave,
  onTogglePreview,
  onToggleGrid,
  onToggleSnap,
  onGroup,
  onUngroup,
  onToggleSelectMode,
  onDeselectAll,
  canGroup,
  canUngroup,
  canUndo,
  canRedo,
  isSaving,
  isPreviewMode,
  isSelectMode,
  gridEnabled,
  snapEnabled,
  hasSelection,
  lastSaved,
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
      {/* Selection Tool */}
      <div className="flex gap-2 border-r border-base-300 pr-3">
        <button
          onClick={onToggleSelectMode}
          className={`btn btn-sm ${isSelectMode ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
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

      {/* Add Objects Section */}
      <div className="flex gap-2 border-r border-base-300 pr-3">
        <button
          onClick={onAddRect}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Add Rectangle"
          disabled={isPreviewMode}
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          onClick={onAddCircle}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Add Circle"
          disabled={isPreviewMode}
        >
          <Circle className="w-4 h-4" />
        </button>
        <button
          onClick={onAddText}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Add Text"
          disabled={isPreviewMode}
        >
          <Type className="w-4 h-4" />
        </button>
        <button
          onClick={onAddLine}
          className="btn btn-sm btn-ghost tooltip tooltip-bottom"
          data-tip="Add Line"
          disabled={isPreviewMode}
        >
          <Minus className="w-4 h-4" />
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

      {/* Save & Preview */}
      <div className="flex gap-2 ml-auto">
        {lastSaved && (
          <span className="text-xs text-gray-500 self-center">
            Last saved: {lastSaved.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={onSave}
          className="btn btn-sm btn-primary tooltip tooltip-bottom"
          data-tip="Save (Ctrl+S)"
          disabled={isSaving || isPreviewMode}
        >
          {isSaving ? (
            <span className="loading loading-spinner loading-xs"></span>
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="hidden sm:inline ml-1">Save</span>
        </button>
        <button
          onClick={onTogglePreview}
          className={`btn btn-sm ${isPreviewMode ? 'btn-accent' : 'btn-ghost'} tooltip tooltip-bottom`}
          data-tip="Toggle Preview Mode"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">{isPreviewMode ? 'Exit Preview' : 'Preview'}</span>
        </button>
      </div>
    </div>
  );
}
