import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faDice, faUndo } from '@fortawesome/free-solid-svg-icons';
import {
  AvatarOptions,
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
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(skinTones).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleOptionChange('skin', key)}
              className={`
                h-14 rounded-lg border-2 transition-all
                ${options.skin === key ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-base-300 hover:border-base-content/20'}
              `}
              style={{ backgroundColor: value }}
              title={key}
            >
              {options.skin === key && (
                <FontAwesomeIcon icon={faCheck} className="text-white drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>
      );
    }

    if (category === 'hairColor') {
      return (
        <div className="grid grid-cols-5 gap-3">
          {Object.entries(hairColors).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleOptionChange('hairColor', key)}
              className={`
                h-14 rounded-lg border-2 transition-all
                ${options.hairColor === key ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-base-300 hover:border-base-content/20'}
              `}
              style={{ backgroundColor: value }}
              title={key}
            >
              {options.hairColor === key && (
                <FontAwesomeIcon icon={faCheck} className="text-white drop-shadow-lg" />
              )}
            </button>
          ))}
        </div>
      );
    }

    if (category === 'clothing') {
      return (
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(clothingStyles).map(([key, style]) => (
            <button
              key={key}
              onClick={() => handleOptionChange('clothing', key)}
              className={`
                h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center gap-1
                ${options.clothing === key ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-base-300 hover:border-base-content/20'}
              `}
            >
              <div
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: style.color }}
              />
              <span className="text-xs">{style.label}</span>
            </button>
          ))}
        </div>
      );
    }

    if (category === 'background') {
      const backgroundColors = [
        '#F5F5F5', '#E3F2FD', '#FFF3E0', '#F3E5F5', '#E8F5E9',
        '#FCE4EC', '#E0F2F1', '#FFF9C4', '#FFE0B2', '#D7CCC8',
        '#CFD8DC', '#F8BBD0', '#C5CAE9', '#B2DFDB', '#DCEDC8',
      ];
      
      return (
        <div className="grid grid-cols-5 gap-3">
          {backgroundColors.map((color) => (
            <button
              key={color}
              onClick={() => handleOptionChange('background', color)}
              className={`
                h-14 rounded-lg border-2 transition-all
                ${options.background === color ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-base-300 hover:border-base-content/20'}
              `}
              style={{ backgroundColor: color }}
            >
              {options.background === color && (
                <FontAwesomeIcon icon={faCheck} className="text-gray-700" />
              )}
            </button>
          ))}
        </div>
      );
    }

    // Default rendering for other categories
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {categoryOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => handleOptionChange(category, option.value)}
            className={`
              btn btn-sm h-auto py-3 px-4 normal-case
              ${options[category as keyof AvatarOptions] === option.value 
                ? 'btn-primary' 
                : 'btn-outline'}
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Header with Actions */}
      <div className="p-4 border-b border-base-300">
        <div className="flex gap-2">
          {onRandomize && (
            <button
              onClick={onRandomize}
              className="btn btn-primary btn-sm gap-2 flex-1"
            >
              <FontAwesomeIcon icon={faDice} />
              Randomize
            </button>
          )}
          {onReset && (
            <button
              onClick={onReset}
              className="btn btn-ghost btn-sm gap-2"
            >
              <FontAwesomeIcon icon={faUndo} />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto bg-base-200 border-b border-base-300">
        <div className="flex min-w-max">
          {AVATAR_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`
                px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap
                ${activeCategory === category.id
                  ? 'text-primary border-b-2 border-primary bg-base-100'
                  : 'text-base-content/60 hover:text-base-content hover:bg-base-100/50'}
              `}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Options Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto">
          {renderOptions(activeCategory)}
        </div>
      </div>
    </div>
  );
};

export default AvatarCustomizer;
