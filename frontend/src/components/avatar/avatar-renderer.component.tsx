import React, { forwardRef } from 'react';
import type { AvatarOptions } from './avatar-options';
import {
  skinTones,
  faceShapes,
  eyeStyles,
  hairColors,
  clothingStyles,
} from './avatar-options';
import type { AvatarAnimation } from './avatar-types';
import './avatar-animations.css';

interface AvatarRendererProps {
  options: AvatarOptions;
  size?: number;
  className?: string;
  animation?: AvatarAnimation;
  animateOnHover?: boolean;
  style?: React.CSSProperties;
}

/**
 * AvatarRenderer Component
 * Renders a detailed, Facebook-style avatar as SVG
 */
const AvatarRenderer = forwardRef<SVGSVGElement, AvatarRendererProps>(({
  options,
  size = 512,
  className = '',
  animation = 'none',
  animateOnHover = false,
  style,
}, ref) => {
  const center = size / 2;
  const skinColor = skinTones[options.skin as keyof typeof skinTones] || skinTones.light;
  const faceShape = faceShapes[options.faceShape as keyof typeof faceShapes] || faceShapes.oval;
  const hairColor = hairColors[options.hairColor as keyof typeof hairColors] || hairColors.brown;
  const clothingColor = clothingStyles[options.clothing as keyof typeof clothingStyles]?.color || '#4A90E2';

  // Calculate proportions
  const faceWidth = (faceShape.width / 512) * size;
  const faceHeight = (faceShape.height / 512) * size;
  
  // Positions
  const eyeY = center - (faceHeight * 0.12);
  const eyeSpacing = faceWidth * 0.22;
  const leftEyeX = center - eyeSpacing;
  const rightEyeX = center + eyeSpacing;
  const noseY = center + 5;
  const mouthY = center + (faceHeight * 0.22);
  const hairY = center - (faceHeight * 0.42);
  const earOffset = faceWidth * 0.48;

  // Eye style properties
  const eyeStyle = eyeStyles[options.eyes as keyof typeof eyeStyles] || eyeStyles.default;
  const eyeSize = eyeStyle.size;
  const eyeShape = eyeStyle.shape;

  // Get darker shade for shadows
  const darkerSkin = `color-mix(in srgb, ${skinColor} 85%, black)`;

  // Build animation class
  const animationClass = React.useMemo(() => {
    if (animation === 'none') return '';
    if (animateOnHover) {
      return `avatar-hover-${animation}`;
    }
    return `avatar-${animation}`;
  }, [animation, animateOnHover]);

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      preserveAspectRatio="xMidYMid meet"
      className={`${className} ${animationClass}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{
        backgroundColor: 'transparent',
        ...style,
      }}
    >
      {/* Background - only render if not transparent */}
      {options.background && options.background !== 'transparent' && (
        <rect width={size} height={size} fill={options.background} />
      )}

      {/* Clothing/Shoulders */}
      <ellipse
        cx={center}
        cy={size - 20}
        rx={faceWidth * 0.75}
        ry={100}
        fill={clothingColor}
      />
      {/* Neck */}
      <rect
        x={center - 35}
        y={center + faceHeight * 0.42}
        width="70"
        height="80"
        fill={skinColor}
      />

      {/* Ears */}
      <ellipse
        cx={center - earOffset}
        cy={center}
        rx="22"
        ry="35"
        fill={skinColor}
        stroke={darkerSkin}
        strokeWidth="1"
      />
      <ellipse
        cx={center + earOffset}
        cy={center}
        rx="22"
        ry="35"
        fill={skinColor}
        stroke={darkerSkin}
        strokeWidth="1"
      />

      {/* Hair (back layer for long hair) */}
      {(options.hair === 'long' || options.hair === 'wavy') && (
        <g>
          <ellipse
            cx={center - faceWidth * 0.35}
            cy={center + 30}
            rx="45"
            ry="140"
            fill={hairColor}
          />
          <ellipse
            cx={center + faceWidth * 0.35}
            cy={center + 30}
            rx="45"
            ry="140"
            fill={hairColor}
          />
        </g>
      )}

      {/* Face Base - DIFFERENT SHAPES */}
      {options.faceShape === 'round' ? (
        // ROUND: Perfect circle
        <circle
          cx={center}
          cy={center}
          r={Math.min(faceWidth, faceHeight) / 2}
          fill={skinColor}
          stroke={darkerSkin}
          strokeWidth="1.5"
        />
      ) : options.faceShape === 'square' ? (
        // SQUARE: Angular, rectangular shape
        <rect
          x={center - faceWidth / 2}
          y={center - faceHeight / 2}
          width={faceWidth}
          height={faceHeight}
          rx={faceWidth * 0.1}
          fill={skinColor}
          stroke={darkerSkin}
          strokeWidth="1.5"
        />
      ) : options.faceShape === 'heart' ? (
        // HEART: Heart-shaped face, wider at top, narrow at chin
        <path
          d={`M ${center} ${center - faceHeight / 2 + 20} 
            Q ${center - faceWidth / 2 - 15} ${center - faceHeight / 2} ${center - faceWidth / 2} ${center - faceHeight / 2 + 15}
            Q ${center - faceWidth * 0.3} ${center} ${center} ${center + faceHeight / 2}
            Q ${center + faceWidth * 0.3} ${center} ${center + faceWidth / 2} ${center - faceHeight / 2 + 15}
            Q ${center + faceWidth / 2 + 15} ${center - faceHeight / 2} ${center} ${center - faceHeight / 2 + 20}
            Z`}
          fill={skinColor}
          stroke={darkerSkin}
          strokeWidth="1.5"
        />
      ) : options.faceShape === 'diamond' ? (
        // DIAMOND: Angular diamond shape
        <polygon
          points={`${center},${center - faceHeight / 2} ${center + faceWidth / 2},${center} ${center},${center + faceHeight / 2} ${center - faceWidth / 2},${center}`}
          fill={skinColor}
          stroke={darkerSkin}
          strokeWidth="1.5"
        />
      ) : (
        // OVAL (default): Standard oval/ellipse
        <ellipse
          cx={center}
          cy={center}
          rx={faceWidth / 2}
          ry={faceHeight / 2}
          fill={skinColor}
          stroke={darkerSkin}
          strokeWidth="1.5"
        />
      )}

      {/* Face Shadows (for depth) */}
      <ellipse
        cx={center}
        cy={center + faceHeight * 0.3}
        rx={faceWidth * 0.3}
        ry={faceHeight * 0.15}
        fill={darkerSkin}
        opacity="0.08"
      />

      {/* Hair (top layer) */}
      {options.hair !== 'none' && (
        <g>
          {/* Main hair shape */}
          {options.hair === 'short' && (
            <ellipse
              cx={center}
              cy={hairY}
              rx={faceWidth * 0.5}
              ry={faceHeight * 0.3}
              fill={hairColor}
            />
          )}
          
          {options.hair === 'medium' && (
            <>
              <ellipse
                cx={center}
                cy={hairY}
                rx={faceWidth * 0.52}
                ry={faceHeight * 0.35}
                fill={hairColor}
              />
              <rect
                x={center - faceWidth * 0.5}
                y={hairY}
                width={faceWidth}
                height={faceHeight * 0.25}
                fill={hairColor}
              />
            </>
          )}

          {(options.hair === 'long' || options.hair === 'wavy') && (
            <ellipse
              cx={center}
              cy={hairY}
              rx={faceWidth * 0.54}
              ry={faceHeight * 0.38}
              fill={hairColor}
            />
          )}

          {options.hair === 'curly' && (
            <>
              <ellipse
                cx={center}
                cy={hairY}
                rx={faceWidth * 0.55}
                ry={faceHeight * 0.38}
                fill={hairColor}
              />
              {/* Curly texture */}
              {[...Array(8)].map((_, i) => (
                <circle
                  key={i}
                  cx={center - faceWidth * 0.4 + (i * faceWidth * 0.12)}
                  cy={hairY - 20}
                  r="18"
                  fill={hairColor}
                  opacity="0.8"
                />
              ))}
            </>
          )}

          {options.hair === 'spiky' && (
            <>
              <ellipse
                cx={center}
                cy={hairY + 10}
                rx={faceWidth * 0.48}
                ry={faceHeight * 0.28}
                fill={hairColor}
              />
              {/* Spikes */}
              {[-2, -1, 0, 1, 2].map((i) => (
                <polygon
                  key={i}
                  points={`
                    ${center + i * 35},${hairY - 45}
                    ${center + i * 35 - 15},${hairY - 5}
                    ${center + i * 35 + 15},${hairY - 5}
                  `}
                  fill={hairColor}
                />
              ))}
            </>
          )}

          {options.hair === 'buzz' && (
            <ellipse
              cx={center}
              cy={hairY + 10}
              rx={faceWidth * 0.46}
              ry={faceHeight * 0.22}
              fill={hairColor}
              opacity="0.9"
            />
          )}
        </g>
      )}

      {/* Eyebrows - COMPLETELY DIFFERENT STYLES */}
      <g fill={`color-mix(in srgb, ${hairColor} 90%, black)`} stroke={`color-mix(in srgb, ${hairColor} 90%, black)`} strokeLinecap="round" strokeLinejoin="round">
        {options.eyebrows === 'thick' ? (
          // THICK: Bold, wide eyebrows
          <>
            <path
              d={`M ${leftEyeX - 28} ${eyeY - 22} Q ${leftEyeX} ${eyeY - 28} ${leftEyeX + 28} ${eyeY - 22}`}
              strokeWidth="8"
              fill="none"
            />
            <path
              d={`M ${rightEyeX - 28} ${eyeY - 22} Q ${rightEyeX} ${eyeY - 28} ${rightEyeX + 28} ${eyeY - 22}`}
              strokeWidth="8"
              fill="none"
            />
          </>
        ) : options.eyebrows === 'thin' ? (
          // THIN: Delicate, single fine line
          <>
            <path
              d={`M ${leftEyeX - 25} ${eyeY - 24} Q ${leftEyeX} ${eyeY - 26} ${leftEyeX + 25} ${eyeY - 24}`}
              strokeWidth="1.5"
              fill="none"
            />
            <path
              d={`M ${rightEyeX - 25} ${eyeY - 24} Q ${rightEyeX} ${eyeY - 26} ${rightEyeX + 25} ${eyeY - 24}`}
              strokeWidth="1.5"
              fill="none"
            />
          </>
        ) : options.eyebrows === 'arched' ? (
          // ARCHED: High dramatic arch
          <>
            <path
              d={`M ${leftEyeX - 25} ${eyeY - 22} Q ${leftEyeX - 10} ${eyeY - 32} ${leftEyeX} ${eyeY - 30} T ${leftEyeX + 25} ${eyeY - 22}`}
              strokeWidth="4"
              fill="none"
            />
            <path
              d={`M ${rightEyeX - 25} ${eyeY - 22} Q ${rightEyeX + 10} ${eyeY - 32} ${rightEyeX} ${eyeY - 30} T ${rightEyeX + 25} ${eyeY - 22}`}
              strokeWidth="4"
              fill="none"
            />
          </>
        ) : options.eyebrows === 'straight' ? (
          // STRAIGHT: Horizontal line, no curve
          <>
            <line
              x1={leftEyeX - 26}
              y1={eyeY - 24}
              x2={leftEyeX + 26}
              y2={eyeY - 24}
              strokeWidth="3.5"
            />
            <line
              x1={rightEyeX - 26}
              y1={eyeY - 24}
              x2={rightEyeX + 26}
              y2={eyeY - 24}
              strokeWidth="3.5"
            />
          </>
        ) : (
          // DEFAULT: Natural slight curve
          <>
            <path
              d={`M ${leftEyeX - 26} ${eyeY - 23} Q ${leftEyeX} ${eyeY - 27} ${leftEyeX + 26} ${eyeY - 23}`}
              strokeWidth="3.5"
              fill="none"
            />
            <path
              d={`M ${rightEyeX - 26} ${eyeY - 23} Q ${rightEyeX} ${eyeY - 27} ${rightEyeX + 26} ${eyeY - 23}`}
              strokeWidth="3.5"
              fill="none"
            />
          </>
        )}
      </g>

      {/* Eyes - COMPLETELY DIFFERENT STYLES */}
      <g>
        {options.eyes === 'squint' ? (
          // SQUINT: Nearly closed, horizontal curved lines
          <>
            {/* Left squint eye */}
            <path
              d={`M ${leftEyeX - 20} ${eyeY} Q ${leftEyeX} ${eyeY - 2} ${leftEyeX + 20} ${eyeY}`}
              stroke="#1A1A1A"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            {/* Tiny iris visible through squint */}
            <circle cx={leftEyeX} cy={eyeY} r="4" fill="#3B82F6" />
            <circle cx={leftEyeX + 1} cy={eyeY} r="2" fill="#1A1A1A" />
            
            {/* Right squint eye */}
            <path
              d={`M ${rightEyeX - 20} ${eyeY} Q ${rightEyeX} ${eyeY - 2} ${rightEyeX + 20} ${eyeY}`}
              stroke="#1A1A1A"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
            />
            <circle cx={rightEyeX} cy={eyeY} r="4" fill="#3B82F6" />
            <circle cx={rightEyeX + 1} cy={eyeY} r="2" fill="#1A1A1A" />
          </>
        ) : options.eyes === 'almond' ? (
          // ALMOND: Sharp, angular, elongated almond shape
          <>
            {/* Left almond eye */}
            <path
              d={`M ${leftEyeX - 22} ${eyeY - 8} Q ${leftEyeX - 15} ${eyeY - 12} ${leftEyeX} ${eyeY - 10} T ${leftEyeX + 22} ${eyeY - 8} T ${leftEyeX + 22} ${eyeY + 8} T ${leftEyeX} ${eyeY + 10} T ${leftEyeX - 22} ${eyeY + 8} Z`}
              fill="white"
              stroke="#1A1A1A"
              strokeWidth="1.5"
            />
            <ellipse cx={leftEyeX} cy={eyeY} rx="12" ry="8" fill="#3B82F6" />
            <ellipse cx={leftEyeX + 2} cy={eyeY} rx="6" ry="5" fill="#1A1A1A" />
            <circle cx={leftEyeX + 4} cy={eyeY - 2} r="2" fill="white" opacity="0.9" />
            
            {/* Right almond eye */}
            <path
              d={`M ${rightEyeX - 22} ${eyeY - 8} Q ${rightEyeX - 15} ${eyeY - 12} ${rightEyeX} ${eyeY - 10} T ${rightEyeX + 22} ${eyeY - 8} T ${rightEyeX + 22} ${eyeY + 8} T ${rightEyeX} ${eyeY + 10} T ${rightEyeX - 22} ${eyeY + 8} Z`}
              fill="white"
              stroke="#1A1A1A"
              strokeWidth="1.5"
            />
            <ellipse cx={rightEyeX} cy={eyeY} rx="12" ry="8" fill="#3B82F6" />
            <ellipse cx={rightEyeX + 2} cy={eyeY} rx="6" ry="5" fill="#1A1A1A" />
            <circle cx={rightEyeX + 4} cy={eyeY - 2} r="2" fill="white" opacity="0.9" />
          </>
        ) : options.eyes === 'large' ? (
          // LARGE: Big, round, wide-open eyes with lots of white
          <>
            {/* Left large eye */}
            <circle cx={leftEyeX} cy={eyeY} r="28" fill="white" stroke="#1A1A1A" strokeWidth="2" />
            <circle cx={leftEyeX} cy={eyeY} r="20" fill="#3B82F6" />
            <circle cx={leftEyeX + 3} cy={eyeY} r="12" fill="#1A1A1A" />
            <circle cx={leftEyeX + 5} cy={eyeY - 4} r="5" fill="white" opacity="0.95" />
            {/* Extra shine for large eyes */}
            <circle cx={leftEyeX - 8} cy={eyeY - 8} r="3" fill="white" opacity="0.6" />
            
            {/* Right large eye */}
            <circle cx={rightEyeX} cy={eyeY} r="28" fill="white" stroke="#1A1A1A" strokeWidth="2" />
            <circle cx={rightEyeX} cy={eyeY} r="20" fill="#3B82F6" />
            <circle cx={rightEyeX + 3} cy={eyeY} r="12" fill="#1A1A1A" />
            <circle cx={rightEyeX + 5} cy={eyeY - 4} r="5" fill="white" opacity="0.95" />
            <circle cx={rightEyeX - 8} cy={eyeY - 8} r="3" fill="white" opacity="0.6" />
          </>
        ) : options.eyes === 'wide' ? (
          // WIDE: Very wide, horizontally stretched, surprised look
          <>
            {/* Left wide eye */}
            <ellipse cx={leftEyeX} cy={eyeY} rx="32" ry="22" fill="white" stroke="#1A1A1A" strokeWidth="2" />
            <ellipse cx={leftEyeX} cy={eyeY} rx="22" ry="18" fill="#3B82F6" />
            <ellipse cx={leftEyeX + 4} cy={eyeY} rx="14" ry="12" fill="#1A1A1A" />
            <ellipse cx={leftEyeX + 6} cy={eyeY - 4} rx="6" ry="5" fill="white" opacity="0.9" />
            
            {/* Right wide eye */}
            <ellipse cx={rightEyeX} cy={eyeY} rx="32" ry="22" fill="white" stroke="#1A1A1A" strokeWidth="2" />
            <ellipse cx={rightEyeX} cy={eyeY} rx="22" ry="18" fill="#3B82F6" />
            <ellipse cx={rightEyeX + 4} cy={eyeY} rx="14" ry="12" fill="#1A1A1A" />
            <ellipse cx={rightEyeX + 6} cy={eyeY - 4} rx="6" ry="5" fill="white" opacity="0.9" />
          </>
        ) : (
          // DEFAULT: Standard round eyes
          <>
            {/* Left default eye */}
            <circle cx={leftEyeX} cy={eyeY} r="22" fill="white" stroke="#1A1A1A" strokeWidth="2" />
            <circle cx={leftEyeX} cy={eyeY} r="15" fill="#3B82F6" />
            <circle cx={leftEyeX + 2} cy={eyeY} r="9" fill="#1A1A1A" />
            <circle cx={leftEyeX + 3} cy={eyeY - 3} r="4" fill="white" opacity="0.9" />
            
            {/* Right default eye */}
            <circle cx={rightEyeX} cy={eyeY} r="22" fill="white" stroke="#1A1A1A" strokeWidth="2" />
            <circle cx={rightEyeX} cy={eyeY} r="15" fill="#3B82F6" />
            <circle cx={rightEyeX + 2} cy={eyeY} r="9" fill="#1A1A1A" />
            <circle cx={rightEyeX + 3} cy={eyeY - 3} r="4" fill="white" opacity="0.9" />
          </>
        )}

        {/* Eyelashes - only for non-squint eyes */}
        {options.eyes !== 'squint' && (
          <g stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round">
            {/* Top lashes */}
            {[...Array(5)].map((_, i) => {
              const offset = (i - 2) * 8;
              return (
                <g key={i}>
                  <line 
                    x1={leftEyeX + offset} 
                    y1={eyeY - (options.eyes === 'large' ? 26 : options.eyes === 'wide' ? 20 : 20)} 
                    x2={leftEyeX + offset - 2} 
                    y2={eyeY - (options.eyes === 'large' ? 32 : options.eyes === 'wide' ? 26 : 26)} 
                  />
                  <line 
                    x1={rightEyeX + offset} 
                    y1={eyeY - (options.eyes === 'large' ? 26 : options.eyes === 'wide' ? 20 : 20)} 
                    x2={rightEyeX + offset - 2} 
                    y2={eyeY - (options.eyes === 'large' ? 32 : options.eyes === 'wide' ? 26 : 26)} 
                  />
                </g>
              );
            })}
          </g>
        )}
      </g>

      {/* Nose - COMPLETELY DIFFERENT STYLES */}
      <g stroke={darkerSkin} fill={darkerSkin} strokeLinecap="round" strokeLinejoin="round">
        {options.nose === 'small' ? (
          // SMALL: Tiny button nose, just dots
          <>
            <circle cx={center - 3} cy={noseY + 5} r="3" fill={darkerSkin} />
            <circle cx={center + 3} cy={noseY + 5} r="3" fill={darkerSkin} />
            <circle cx={center} cy={noseY + 2} r="2" fill={darkerSkin} />
          </>
        ) : options.nose === 'large' ? (
          // LARGE: Big, prominent nose with wide nostrils
          <>
            {/* Bridge */}
            <path d={`M ${center} ${noseY - 25} L ${center} ${noseY + 15}`} strokeWidth="3.5" />
            {/* Wide nostrils */}
            <ellipse cx={center - 10} cy={noseY + 12} rx="8" ry="6" fill={darkerSkin} />
            <ellipse cx={center + 10} cy={noseY + 12} rx="8" ry="6" fill={darkerSkin} />
            {/* Tip */}
            <ellipse cx={center} cy={noseY + 8} rx="6" ry="5" fill={darkerSkin} />
          </>
        ) : options.nose === 'pointed' ? (
          // POINTED: Sharp, angular, triangle-like
          <>
            <path d={`M ${center} ${noseY - 18} L ${center + 4} ${noseY + 12} L ${center - 6} ${noseY + 8} Z`} fill={darkerSkin} />
            <path d={`M ${center} ${noseY - 18} L ${center + 4} ${noseY + 12} L ${center + 8} ${noseY + 6} Z`} fill={darkerSkin} />
            <line x1={center - 6} y1={noseY + 8} x2={center + 8} y2={noseY + 6} stroke={darkerSkin} strokeWidth="2" />
          </>
        ) : options.nose === 'wide' ? (
          // WIDE: Broad, flat nose with wide spacing
          <>
            {/* Flat bridge */}
            <rect x={center - 8} y={noseY - 12} width="16" height="20" rx="3" fill={darkerSkin} />
            {/* Very wide nostrils */}
            <ellipse cx={center - 12} cy={noseY + 10} rx="10" ry="8" fill={darkerSkin} />
            <ellipse cx={center + 12} cy={noseY + 10} rx="10" ry="8" fill={darkerSkin} />
            {/* Divider line */}
            <line x1={center} y1={noseY - 12} x2={center} y2={noseY + 10} stroke={skinColor} strokeWidth="1" opacity="0.5" />
          </>
        ) : (
          // DEFAULT: Standard proportional nose
          <>
            <path d={`M ${center} ${noseY - 15} L ${center} ${noseY + 8}`} strokeWidth="2.5" />
            <path d={`M ${center} ${noseY + 8} Q ${center - 7} ${noseY + 13} ${center - 9} ${noseY + 7}`} strokeWidth="2" />
            <path d={`M ${center} ${noseY + 8} Q ${center + 7} ${noseY + 13} ${center + 9} ${noseY + 7}`} strokeWidth="2" />
            {/* Nostrils */}
            <circle cx={center - 8} cy={noseY + 6} r="2.5" fill={darkerSkin} />
            <circle cx={center + 8} cy={noseY + 6} r="2.5" fill={darkerSkin} />
          </>
        )}
      </g>

      {/* Mouth - COMPLETELY DIFFERENT EXPRESSIONS */}
      <g>
        {options.mouth === 'smile' ? (
          // SMILE: Happy upward curve
          <>
            <path
              d={`M ${center - 35} ${mouthY + 5} Q ${center} ${mouthY + 25} ${center + 35} ${mouthY + 5}`}
              stroke="#D97D7D"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {/* Teeth showing slightly */}
            <path
              d={`M ${center - 28} ${mouthY + 4} Q ${center} ${mouthY + 18} ${center + 28} ${mouthY + 4}`}
              stroke="white"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              opacity="0.7"
            />
          </>
        ) : options.mouth === 'neutral' ? (
          // NEUTRAL: Straight line, no expression
          <>
            <line
              x1={center - 30}
              y1={mouthY + 8}
              x2={center + 30}
              y2={mouthY + 8}
              stroke="#D97D7D"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        ) : options.mouth === 'grin' ? (
          // GRIN: Wide open smile with teeth
          <>
            {/* Wide curved smile */}
            <path
              d={`M ${center - 45} ${mouthY - 5} Q ${center} ${mouthY + 32} ${center + 45} ${mouthY - 5}`}
              stroke="#D97D7D"
              strokeWidth="3"
              fill="white"
              strokeLinecap="round"
            />
            {/* Top row of teeth */}
            <rect x={center - 24} y={mouthY - 2} width="6" height="12" fill="white" rx="1" />
            <rect x={center - 16} y={mouthY - 2} width="6" height="12" fill="white" rx="1" />
            <rect x={center - 8} y={mouthY - 2} width="6" height="12" fill="white" rx="1" />
            <rect x={center} y={mouthY - 2} width="6" height="12" fill="white" rx="1" />
            <rect x={center + 8} y={mouthY - 2} width="6" height="12" fill="white" rx="1" />
            <rect x={center + 16} y={mouthY - 2} width="6" height="12" fill="white" rx="1" />
          </>
        ) : options.mouth === 'laugh' ? (
          // LAUGH: Open mouth laughing, showing tongue
          <>
            {/* Open laughing mouth */}
            <ellipse
              cx={center}
              cy={mouthY + 12}
              rx="35"
              ry="28"
              fill="#D97D7D"
              stroke="#C06060"
              strokeWidth="2"
            />
            {/* Inside of mouth - dark */}
            <ellipse
              cx={center}
              cy={mouthY + 12}
              rx="28"
              ry="22"
              fill="#8B3A3A"
            />
            {/* Tongue */}
            <ellipse
              cx={center}
              cy={mouthY + 18}
              rx="20"
              ry="14"
              fill="#FF6B9D"
            />
            {/* Bottom teeth */}
            <rect x={center - 20} y={mouthY + 8} width="5" height="8" fill="white" />
            <rect x={center - 12} y={mouthY + 8} width="5" height="8" fill="white" />
            <rect x={center - 4} y={mouthY + 8} width="5" height="8" fill="white" />
            <rect x={center + 4} y={mouthY + 8} width="5" height="8" fill="white" />
            <rect x={center + 12} y={mouthY + 8} width="5" height="8" fill="white" />
          </>
        ) : (
          // SERIOUS: Downward curve, frowning
          <>
            <path
              d={`M ${center - 30} ${mouthY + 10} Q ${center} ${mouthY - 5} ${center + 30} ${mouthY + 10}`}
              stroke="#D97D7D"
              strokeWidth="3.5"
              fill="none"
              strokeLinecap="round"
            />
            {/* Frown lines at corners */}
            <line x1={center - 32} y1={mouthY + 8} x2={center - 28} y2={mouthY + 12} stroke="#D97D7D" strokeWidth="2" />
            <line x1={center + 32} y1={mouthY + 8} x2={center + 28} y2={mouthY + 12} stroke="#D97D7D" strokeWidth="2" />
          </>
        )}
      </g>

      {/* Facial Hair */}
      {options.facialHair !== 'none' && (
        <g fill={hairColor} opacity="0.85">
          {(options.facialHair === 'stubble') && (
            <ellipse
              cx={center}
              cy={mouthY + 35}
              rx={faceWidth * 0.32}
              ry={18}
              opacity="0.25"
            />
          )}
          
          {options.facialHair === 'mustache' && (
            <>
              <ellipse cx={center - 15} cy={mouthY - 8} rx="18" ry="6" />
              <ellipse cx={center + 15} cy={mouthY - 8} rx="18" ry="6" />
            </>
          )}
          
          {(options.facialHair === 'beard' || options.facialHair === 'full') && (
            <>
              <ellipse
                cx={center}
                cy={center + faceHeight * 0.32}
                rx={faceWidth * 0.38}
                ry={faceHeight * 0.18}
              />
              {options.facialHair === 'full' && (
                <>
                  <ellipse cx={center - 15} cy={mouthY - 8} rx="18" ry="6" />
                  <ellipse cx={center + 15} cy={mouthY - 8} rx="18" ry="6" />
                </>
              )}
            </>
          )}
          
          {options.facialHair === 'goatee' && (
            <ellipse
              cx={center}
              cy={mouthY + 28}
              rx={22}
              ry={32}
            />
          )}
        </g>
      )}

      {/* Accessories */}
      {options.accessories === 'glasses' && (
        <g>
          {/* Frames */}
          <circle cx={leftEyeX} cy={eyeY} r="28" fill="none" stroke="#2C2C2C" strokeWidth="3" />
          <circle cx={rightEyeX} cy={eyeY} r="28" fill="none" stroke="#2C2C2C" strokeWidth="3" />
          {/* Bridge */}
          <line x1={leftEyeX + 28} y1={eyeY} x2={rightEyeX - 28} y2={eyeY} stroke="#2C2C2C" strokeWidth="3" />
          {/* Lens glare */}
          <circle cx={leftEyeX - 8} cy={eyeY - 8} r="6" fill="white" opacity="0.4" />
          <circle cx={rightEyeX - 8} cy={eyeY - 8} r="6" fill="white" opacity="0.4" />
        </g>
      )}
      
      {options.accessories === 'sunglasses' && (
        <g>
          <rect
            x={leftEyeX - 32}
            y={eyeY - 20}
            width="64"
            height="40"
            rx="8"
            fill="#1A1A1A"
            stroke="#2C2C2C"
            strokeWidth="3"
          />
          <rect
            x={rightEyeX - 32}
            y={eyeY - 20}
            width="64"
            height="40"
            rx="8"
            fill="#1A1A1A"
            stroke="#2C2C2C"
            strokeWidth="3"
          />
          <rect
            x={center - 12}
            y={eyeY - 4}
            width="24"
            height="8"
            fill="#2C2C2C"
          />
          {/* Glare */}
          <rect x={leftEyeX - 22} y={eyeY - 12} width="20" height="4" fill="white" opacity="0.2" />
          <rect x={rightEyeX - 22} y={eyeY - 12} width="20" height="4" fill="white" opacity="0.2" />
        </g>
      )}

      {options.accessories === 'hat' && (
        <g fill="#3B3B3B">
          <ellipse cx={center} cy={hairY - 25} rx={faceWidth * 0.65} ry="12" />
          <rect
            x={center - faceWidth * 0.45}
            y={hairY - 60}
            width={faceWidth * 0.9}
            height="35"
            rx="8"
          />
        </g>
      )}

      {options.accessories === 'cap' && (
        <g fill="#E74C3C">
          <ellipse cx={center} cy={hairY - 15} rx={faceWidth * 0.58} ry="10" />
          <ellipse cx={center} cy={hairY - 35} rx={faceWidth * 0.5} ry={faceHeight * 0.25} />
          {/* Visor */}
          <ellipse cx={center + 10} cy={hairY - 5} rx="55" ry="18" fill="#C0392B" />
        </g>
      )}

      {options.accessories === 'headband' && (
        <rect
          x={center - faceWidth * 0.5}
          y={hairY + 20}
          width={faceWidth}
          height="12"
          fill="#9B59B6"
          rx="6"
        />
      )}

      {options.accessories === 'earrings' && (
        <>
          <circle cx={center - earOffset - 5} cy={center + 15} r="5" fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
          <circle cx={center + earOffset + 5} cy={center + 15} r="5" fill="#FFD700" stroke="#DAA520" strokeWidth="1" />
        </>
      )}

      {/* Cheeks (blush) */}
      <ellipse
        cx={center - faceWidth * 0.28}
        cy={center + 15}
        rx="18"
        ry="12"
        fill="#FFB6C1"
        opacity="0.3"
      />
      <ellipse
        cx={center + faceWidth * 0.28}
        cy={center + 15}
        rx="18"
        ry="12"
        fill="#FFB6C1"
        opacity="0.3"
      />
    </svg>
  );
});

AvatarRenderer.displayName = 'AvatarRenderer';

export default AvatarRenderer;
