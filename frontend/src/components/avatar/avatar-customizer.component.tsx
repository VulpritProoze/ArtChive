import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faDice, faUndo, faEye, faEyebrow, faNose, faSmile, faUserCircle, faTshirt, faPalette } from '@fortawesome/free-solid-svg-icons';
import type { AvatarOptions } from './avatar-options';
import {
  AVATAR_CATEGORIES,
  AVATAR_OPTIONS,
  skinTones,
  hairColors,
  clothingStyles,
  faceShapes,
  eyeStyles,
  eyebrowStyles,
  noseStyles,
  mouthStyles,
  hairStyles,
  facialHairStyles,
  accessories,
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
        <div className="space-y-3">
          <div className="text-sm text-base-content/70 font-medium">Choose your skin tone</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {Object.entries(skinTones).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleOptionChange('skin', key)}
                className={`
                  h-16 rounded-xl border-3 transition-all transform hover:scale-105 flex flex-col items-center justify-center gap-1 shadow-md
                  ${options.skin === key 
                    ? 'border-primary ring-4 ring-primary ring-opacity-30 scale-105' 
                    : 'border-base-300 hover:border-primary/50 hover:shadow-lg'}
                `}
                style={{ backgroundColor: value }}
                title={key.charAt(0).toUpperCase() + key.slice(1)}
              >
                {options.skin === key && (
                  <FontAwesomeIcon icon={faCheck} className="text-white drop-shadow-lg text-xl" />
                )}
              </button>
            ))}
          </div>
          <div className="text-xs text-base-content/50 text-center">
            {options.skin.charAt(0).toUpperCase() + options.skin.slice(1)} selected
          </div>
        </div>
      );
    }

    if (category === 'hairColor') {
      return (
        <div className="space-y-3">
          <div className="text-sm text-base-content/70 font-medium">Choose your hair color</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {Object.entries(hairColors).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleOptionChange('hairColor', key)}
                className={`
                  h-16 rounded-xl border-3 transition-all transform hover:scale-105 flex flex-col items-center justify-center gap-1 shadow-md
                  ${options.hairColor === key 
                    ? 'border-primary ring-4 ring-primary ring-opacity-30 scale-105' 
                    : 'border-base-300 hover:border-primary/50 hover:shadow-lg'}
                `}
                style={{ backgroundColor: value }}
                title={key.charAt(0).toUpperCase() + key.slice(1)}
              >
                {options.hairColor === key && (
                  <FontAwesomeIcon icon={faCheck} className="text-white drop-shadow-lg text-xl" />
                )}
              </button>
            ))}
          </div>
          <div className="text-xs text-base-content/50 text-center">
            {options.hairColor.charAt(0).toUpperCase() + options.hairColor.slice(1)} selected
          </div>
        </div>
      );
    }

    if (category === 'clothing') {
      return (
        <div className="space-y-3">
          <div className="text-sm text-base-content/70 font-medium">Choose your clothing style</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Object.entries(clothingStyles).map(([key, style]) => (
              <button
                key={key}
                onClick={() => handleOptionChange('clothing', key)}
                className={`
                  h-20 rounded-xl border-3 transition-all transform hover:scale-105 flex flex-col items-center justify-center gap-2 shadow-md
                  ${options.clothing === key 
                    ? 'border-primary ring-4 ring-primary ring-opacity-30 scale-105 bg-base-100' 
                    : 'border-base-300 hover:border-primary/50 hover:shadow-lg bg-base-100'}
                `}
              >
                <div
                  className="w-10 h-10 rounded-full shadow-inner"
                  style={{ backgroundColor: style.color }}
                />
                <span className="text-xs font-medium">{style.label}</span>
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
      
      return (
        <div className="space-y-3">
          <div className="text-sm text-base-content/70 font-medium">Choose background color</div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {backgroundColors.map(({ color, name }) => (
              <button
                key={color}
                onClick={() => handleOptionChange('background', color)}
                className={`
                  h-16 rounded-xl border-3 transition-all transform hover:scale-105 shadow-md
                  ${options.background === color 
                    ? 'border-primary ring-4 ring-primary ring-opacity-30 scale-105' 
                    : 'border-base-300 hover:border-primary/50 hover:shadow-lg'}
                `}
                style={{ backgroundColor: color }}
                title={name}
              >
                {options.background === color && (
                  <FontAwesomeIcon icon={faCheck} className="text-gray-700 text-xl" />
                )}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Enhanced rendering for facial feature categories with icons
    return (
      <div className="space-y-3">
        <div className="text-sm text-base-content/70 font-medium">
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
                  relative h-14 rounded-xl border-3 transition-all transform hover:scale-105 font-medium text-sm shadow-md
                  ${isSelected
                    ? 'btn-primary border-primary ring-4 ring-primary ring-opacity-30 scale-105' 
                    : 'btn-outline border-base-300 hover:border-primary/50 hover:shadow-lg bg-base-100'}
                `}
              >
                {isSelected && (
                  <FontAwesomeIcon 
                    icon={faCheck} 
                    className="absolute top-1 right-1 text-xs opacity-70" 
                  />
                )}
                <span className="truncate px-2">{option.label}</span>
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
      <div className="p-6 border-b-2 border-base-300 bg-base-100/80 backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <h3 className="text-lg font-bold text-base-content/90 flex items-center gap-2 flex-1">
            <FontAwesomeIcon icon={faPalette} className="text-primary" />
            Customize Your Avatar
          </h3>
          <div className="flex gap-2">
            {onRandomize && (
              <button
                onClick={onRandomize}
                className="btn btn-primary btn-sm gap-2 shadow-md hover:shadow-lg transition-all"
              >
                <FontAwesomeIcon icon={faDice} />
                Randomize
              </button>
            )}
            {onReset && (
              <button
                onClick={onReset}
                className="btn btn-ghost btn-sm gap-2 hover:bg-base-200"
              >
                <FontAwesomeIcon icon={faUndo} />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modern Category Tabs with Icons */}
      <div className="flex overflow-x-auto bg-base-200/50 border-b-2 border-base-300 shadow-inner">
        <div className="flex min-w-max px-2 py-1">
          {AVATAR_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`
                px-4 py-3 text-sm font-medium transition-all whitespace-nowrap rounded-t-lg mx-1
                ${activeCategory === category.id
                  ? 'text-primary border-b-3 border-primary bg-base-100 shadow-md -mb-[2px]'
                  : 'text-base-content/60 hover:text-base-content hover:bg-base-100/60'}
              `}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options Grid with Better Spacing */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          {renderOptions(activeCategory)}
        </div>
      </div>
    </div>
  );
};

export default AvatarCustomizer;
