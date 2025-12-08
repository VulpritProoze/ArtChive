import { Type, Image, Undo2, Redo2, Grid, Magnet, Group as GroupIcon, Ungroup, MousePointer2, X, Move, Hand, Shapes, Save, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useUploadImage } from '@hooks/gallery/editor/use-upload-image.hook';
import { toast } from '@utils/toast.util';
import type { CanvasObject, TextObject } from '@types';

type EditorMode = 'pan' | 'move' | 'select';

interface ToolbarProps {
  onAddText: () => void;
  onAddImage: (url: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleGrid: () => void;
  onToggleSnap: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onSetMode: (mode: EditorMode) => void;
  onDeselectAll: () => void;
  onOpenMenu: () => void;
  onToggleShapes: () => void;
  onSave?: () => void;
  onUpdateObject?: (id: string, updates: Partial<CanvasObject>) => void;
  selectedObjects?: CanvasObject[];
  showShapes: boolean;
  shapesButtonRef: React.RefObject<HTMLButtonElement | null>;
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
  isSaving?: boolean;
}

export function Toolbar({
  onAddText,
  onAddImage,
  onUndo,
  onRedo,
  onToggleGrid,
  onToggleSnap,
  onGroup,
  onUngroup,
  onSetMode,
  onDeselectAll,
  onOpenMenu,
  onToggleShapes,
  onSave,
  onUpdateObject,
  selectedObjects = [],
  showShapes,
  shapesButtonRef,
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
  isSaving = false,
}: ToolbarProps) {
  const { upload, isUploading, progress } = useUploadImage();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await upload(file);
      if (url) {
        onAddImage(url);
        // Don't show success toast here - let handleAddImage show it after image loads
      } else {
        toast.error('Failed to upload image', 'The upload did not return a valid image URL');
      }
    } catch (error) {
      toast.error('Failed to upload image', 'An error occurred while uploading your image');
    }

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="bg-base-200 p-3 flex items-center gap-2 flex-wrap">
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
          ref={shapesButtonRef}
          onClick={onToggleShapes}
          className={`btn btn-sm ${showShapes ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
          data-tip="Shapes"
          disabled={isPreviewMode}
        >
          <Shapes className="w-4 h-4" />
        </button>
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

      {/* Text Formatting Section - Only show when text is selected */}
      {(() => {
        const selectedText = selectedObjects.length === 1 && selectedObjects[0]?.type === 'text' 
          ? selectedObjects[0] as TextObject 
          : null;
        
        if (!selectedText || isPreviewMode) return null;
        
        const handleTextFormat = (property: string, value: any) => {
          if (!selectedText || !onUpdateObject) return;
          
          if (property === 'fontStyle') {
            // Handle bold/italic combinations
            const currentStyle = selectedText.fontStyle || '';
            let newStyle = currentStyle;
            
            if (value === 'bold') {
              if (currentStyle.includes('bold')) {
                newStyle = currentStyle.replace(/bold/gi, '').trim();
              } else {
                newStyle = (currentStyle + ' bold').trim();
              }
            } else if (value === 'italic') {
              if (currentStyle.includes('italic')) {
                newStyle = currentStyle.replace(/italic/gi, '').trim();
              } else {
                newStyle = (currentStyle + ' italic').trim();
              }
            }
            
            onUpdateObject(selectedText.id, { fontStyle: newStyle || undefined });
          } else if (property === 'textDecoration') {
            // Toggle underline
            const currentDecoration = selectedText.textDecoration || '';
            const newDecoration = currentDecoration === 'underline' ? undefined : 'underline';
            onUpdateObject(selectedText.id, { textDecoration: newDecoration });
          } else {
            onUpdateObject(selectedText.id, { [property]: value });
          }
        };
        
        return (
          <div className="flex gap-2 border-r border-base-300 pr-3">
            <button
              onClick={() => handleTextFormat('fontStyle', 'bold')}
              className={`btn btn-sm ${selectedText.fontStyle?.includes('bold') ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
              data-tip="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleTextFormat('fontStyle', 'italic')}
              className={`btn btn-sm ${selectedText.fontStyle?.includes('italic') ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
              data-tip="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleTextFormat('textDecoration', 'underline')}
              className={`btn btn-sm ${selectedText.textDecoration === 'underline' ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
              data-tip="Underline (Ctrl+U)"
            >
              <Underline className="w-4 h-4" />
            </button>
            <div className="divider divider-horizontal mx-0"></div>
            <button
              onClick={() => handleTextFormat('align', 'left')}
              className={`btn btn-sm ${(!selectedText.align || selectedText.align === 'left') ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
              data-tip="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleTextFormat('align', 'center')}
              className={`btn btn-sm ${selectedText.align === 'center' ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
              data-tip="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleTextFormat('align', 'right')}
              className={`btn btn-sm ${selectedText.align === 'right' ? 'btn-primary' : 'btn-ghost'} tooltip tooltip-bottom`}
              data-tip="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </div>
        );
      })()}

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

      {/* Unsaved Changes, Save Button & Menu */}
      <div className="flex gap-2 ml-auto items-center">
        {hasUnsavedChanges && (
          <span className="text-xs text-warning font-medium">
            Unsaved changes
          </span>
        )}
        {hasUnsavedChanges && onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className="btn btn-sm btn-primary tooltip tooltip-bottom"
            data-tip={isSaving ? 'Saving...' : 'Save Gallery (Ctrl+S)'}
          >
            <Save className="w-4 h-4" />
            <span className="text-xs">{isSaving ? 'Saving...' : 'Save'}</span>
          </button>
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
