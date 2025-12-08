import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faDice, faUndo, faPalette } from '@fortawesome/free-solid-svg-icons';
import type { AvatarOptions } from './avatar-options';
import {
  AVATAR_CATEGORIES,
  AVATAR_OPTIONS,
  skinTones,
  hairColors,
  clothingStyles,
} from './avatar-options';

interface AvatarCustomizerProps {
  options: AvatarOptions;
  onChange: (options: AvatarOptions) => void;
  onRandomize?: () => void;
  onReset?: () => void;
}

/**
 * AvatarCustomizer Component
 * Clean, minimalist UI for avatar customization
 */
const AvatarCustomizer: React.FC<AvatarCustomizerProps> = ({
  options,
  onChange,
  onRandomize,
  onReset,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('skin');

  const handleOptionChange = (category: string, value: string) => {
    onChange({
      ...options,
      [category]: value,
    });
  };

  const renderOptions = (category: string) => {
    const categoryOptions = AVATAR_OPTIONS[category as keyof typeof AVATAR_OPTIONS];
    
    if (!categoryOptions) return null;

    // Special rendering for color-based categories
    if (category === 'skin') {
      return (
        <div className="space-y-4">
          <div className="text-base font-semibold text-base-content">Choose your skin tone</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
            {Object.entries(skinTones).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleOptionChange('skin', key)}
                className={`
                  h-20 rounded-xl border-3 transition-all duration-200 transform hover:scale-110 active:scale-95 flex flex-col items-center justify-center gap-2 shadow-md relative
                  ${options.skin === key 
                    ? 'border-primary ring-4 ring-primary ring-opacity-30 scale-110 shadow-xl' 
                    : 'border-base-300 hover:border-primary/50 hover:shadow-lg'}
                `}
                style={{ backgroundColor: value }}
                title={key.charAt(0).toUpperCase() + key.slice(1)}
              >
                {options.skin === key && (
                  <>
                    <FontAwesomeIcon icon={faCheck} className="text-white drop-shadow-lg text-xl animate-scale-in" />
                    <span className="text-xs font-medium text-white drop-shadow-lg">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  </>
                )}
              </button>
            ))}
          </div>
          <div className="text-sm text-base-content/70 text-center font-medium">
            {options.skin.charAt(0).toUpperCase() + options.skin.slice(1)} selected
          </div>
        </div>
      );
    }

    if (category === 'hairColor') {
      return (
        <div className="space-y-4">
          <div className="text-base font-semibold text-base-content">Choose your hair color</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
            {Object.entries(hairColors).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleOptionChange('hairColor', key)}
                className={`
                  h-20 rounded-xl border-3 transition-all duration-200 transform hover:scale-110 active:scale-95 flex flex-col items-center justify-center gap-2 shadow-md relative
                  ${options.hairColor === key 
                    ? 'border-primary ring-4 ring-primary ring-opacity-30 scale-110 shadow-xl' 
                    : 'border-base-300 hover:border-primary/50 hover:shadow-lg'}
                `}
                style={{ backgroundColor: value }}
                title={key.charAt(0).toUpperCase() + key.slice(1)}
              >
                {options.hairColor === key && (
                  <>
                    <FontAwesomeIcon icon={faCheck} className="text-white drop-shadow-lg text-xl animate-scale-in" />
                    <span className="text-xs font-medium text-white drop-shadow-lg">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                  </>
                )}
              </button>
            ))}
          </div>
          <div className="text-sm text-base-content/70 text-center font-medium">
            {options.hairColor.charAt(0).toUpperCase() + options.hairColor.slice(1)} selected
          </div>
        </div>
      );
    }

    if (category === 'clothing') {
      return (
        <div className="space-y-4">
          <div className="text-base font-semibold text-base-content">Choose your clothing style</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(clothingStyles).map(([key, style]) => (
              <button
                key={key}
                onClick={() => handleOptionChange('clothing', key)}
                className={`
                  min-h-24 rounded-xl border-3 transition-all transform hover:scale-105 flex flex-col items-center justify-center gap-3 shadow-md px-4 py-4
                  ${options.clothing === key
                    ? 'border-primary ring-4 ring-primary ring-opacity-30 scale-105 bg-base-100' 
                    : 'border-base-300 hover:border-primary/50 hover:shadow-lg bg-base-100'}
                `}
              >
                <div
                  className="w-12 h-12 rounded-full shadow-inner"
                  style={{ backgroundColor: style.color }}
                />
                <span className="text-sm font-medium text-center leading-tight break-words">{style.description}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (category === 'background') {
      const backgroundColors = [
        { color: '#F5F5F5', name: 'Light Gray' },
        { color: '#E3F2FD', name: 'Sky Blue' },
        { color: '#FFF3E0', name: 'Peach' },
        { color: '#F3E5F5', name: 'Lavender' },
        { color: '#E8F5E9', name: 'Mint' },
        { color: '#FCE4EC', name: 'Pink' },
        { color: '#E0F2F1', name: 'Teal' },
        { color: '#FFF9C4', name: 'Yellow' },
        { color: '#FFE0B2', name: 'Orange' },
        { color: '#D7CCC8', name: 'Brown' },
        { color: '#CFD8DC', name: 'Blue Gray' },
        { color: '#F8BBD0', name: 'Rose' },
        { color: '#C5CAE9', name: 'Indigo' },
        { color: '#B2DFDB', name: 'Cyan' },
        { color: '#DCEDC8', name: 'Light Green' },
      ];
      
      const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Validate hex color
        if (/^#[0-9A-Fa-f]{0,6}$/.test(value) && value.length === 7) {
          handleOptionChange('background', value);
        } else if (value.startsWith('#') && value.length <= 7) {
          // Allow partial input
          handleOptionChange('background', value);
        }
      };
      
      return (
        <div className="space-y-5">
          <div className="text-base font-semibold text-base-content">Choose background color</div>
          
          {/* Color Picker with Hex Input */}
          <div className="bg-base-100 rounded-xl p-4 border border-base-300">
            <label className="label py-2">
              <span className="label-text text-sm font-medium">Custom Color</span>
            </label>
            <div className="flex gap-3">
              <input
                type="color"
                value={options.background}
                onChange={(e) => handleOptionChange('background', e.target.value)}
                className="h-12 w-16 rounded-lg border-2 border-base-300 cursor-pointer hover:border-primary transition-all"
                title="Pick a color"
              />
              <input
                type="text"
                value={options.background}
                onChange={handleColorInputChange}
                placeholder="#FFFFFF"
                className="input input-bordered flex-1 font-mono text-sm focus:input-primary"
                maxLength={7}
              />
            </div>
            <div className="mt-3 text-xs text-base-content/50 text-center">
              Current: <span className="font-mono font-semibold">{options.background}</span>
            </div>
          </div>
          
          {/* Preset Colors */}
          <div>
            <div className="text-sm text-base-content/70 font-medium mb-3">Or choose a preset</div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {backgroundColors.map(({ color, name }) => (
                <button
                  key={color}
                  onClick={() => handleOptionChange('background', color)}
                  className={`
                    h-20 rounded-xl border-3 transition-all transform hover:scale-105 shadow-md flex flex-col items-center justify-center gap-1 relative
                    ${options.background === color 
                      ? 'border-primary ring-4 ring-primary ring-opacity-30 scale-105' 
                      : 'border-base-300 hover:border-primary/50 hover:shadow-lg'}
                  `}
                  style={{ backgroundColor: color }}
                  title={name}
                >
                  {options.background === color && (
                    <>
                      <FontAwesomeIcon icon={faCheck} className="text-gray-700 text-xl drop-shadow-lg" />
                      <span className="text-xs font-medium text-gray-700 drop-shadow-lg">{name}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Enhanced rendering for facial feature categories with icons
    return (
      <div className="space-y-4">
        <div className="text-base font-semibold text-base-content">
          Select {AVATAR_CATEGORIES.find(cat => cat.id === category)?.label.toLowerCase()}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {categoryOptions.map((option) => {
            const isSelected = options[category as keyof AvatarOptions] === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleOptionChange(category, option.value)}
                className={`
                  relative min-h-16 rounded-xl border-3 transition-all transform hover:scale-105 font-medium shadow-md
                  flex items-center justify-center px-3 py-3 text-sm
                  ${isSelected
                    ? 'btn-primary border-primary ring-4 ring-primary ring-opacity-30 scale-105' 
                    : 'btn-outline border-base-300 hover:border-primary/50 hover:shadow-lg bg-base-100'}
                `}
              >
                {isSelected && (
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="absolute top-2 right-2 text-xs opacity-90" 
                  />
                )}
                <span className="text-center leading-tight break-words">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-base-100 to-base-200">
      {/* Modern Header with Actions */}
      <div className="p-4 border-b-2 border-base-300 bg-base-100/90 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <h3 className="text-lg font-bold text-base-content/90 flex items-center gap-2">
            <FontAwesomeIcon icon={faPalette} className="text-primary" />
            Customize Your Avatar
          </h3>
          <div className="flex gap-2">
            {onRandomize && (
              <button
                onClick={onRandomize}
                className="btn btn-primary btn-sm gap-2 shadow-md hover:shadow-lg transition-all"
                title="Generate random avatar"
              >
                <FontAwesomeIcon icon={faDice} />
                Randomize
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="btn btn-ghost btn-sm gap-2 hover:bg-base-200 transition-all"
                title="Reset to defaults"
              >
                <FontAwesomeIcon icon={faUndo} />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Category Tabs with Icons - Scrollable */}
      <div className="flex overflow-x-auto bg-base-200/50 border-b-2 border-base-300 shadow-inner sticky top-[73px] z-10" style={{ scrollbarWidth: 'thin' }}>
        <div className="flex min-w-max px-2 py-2">
          {AVATAR_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`
                px-4 py-2 text-sm font-medium transition-all whitespace-nowrap rounded-lg mx-1
                ${activeCategory === category.id
                  ? 'text-primary bg-base-100 shadow-md border-2 border-primary'
                  : 'text-base-content/70 hover:text-base-content hover:bg-base-100/80 border-2 border-transparent'}
              `}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options Grid with Better Spacing - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-full">
          {renderOptions(activeCategory)}
        </div>
      </div>
    </div>
  );
};

export default AvatarCustomizer;
