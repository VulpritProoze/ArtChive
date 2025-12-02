import React from 'react';
import {
  AvatarOptions,
  skinTones,
  faceShapes,
  eyeStyles,
  hairColors,
  clothingStyles,
} from './avatar-options';

interface AvatarRendererProps {
  options: AvatarOptions;
  size?: number;
  className?: string;
}

/**
 * AvatarRenderer Component
 * Renders a detailed, Facebook-style avatar as SVG
 */
const AvatarRenderer: React.FC<AvatarRendererProps> = ({
  options,
  size = 512,
  className = '',
}) => {
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

  // Eye size
  const eyeSize = eyeStyles[options.eyes as keyof typeof eyeStyles]?.size || 15;

  // Get darker shade for shadows
  const darkerSkin = `color-mix(in srgb, ${skinColor} 85%, black)`;
  const lighterSkin = `color-mix(in srgb, ${skinColor} 95%, white)`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background */}
      <rect width={size} height={size} fill={options.background} />

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

      {/* Face Base */}
      <ellipse
        cx={center}
        cy={center}
        rx={faceWidth / 2}
        ry={faceHeight / 2}
        fill={skinColor}
        stroke={darkerSkin}
        strokeWidth="1.5"
      />

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

      {/* Eyebrows */}
      <g fill={`color-mix(in srgb, ${hairColor} 90%, black)`}>
        {/* Left eyebrow */}
        <path
          d={`M ${leftEyeX - 25} ${eyeY - 22} Q ${leftEyeX} ${eyeY - 26} ${leftEyeX + 25} ${eyeY - 22}`}
          fill="none"
          stroke={`color-mix(in srgb, ${hairColor} 90%, black)`}
          strokeWidth={options.eyebrows === 'thick' ? '4' : options.eyebrows === 'thin' ? '2' : '3'}
          strokeLinecap="round"
        />
        {/* Right eyebrow */}
        <path
          d={`M ${rightEyeX - 25} ${eyeY - 22} Q ${rightEyeX} ${eyeY - 26} ${rightEyeX + 25} ${eyeY - 22}`}
          fill="none"
          stroke={`color-mix(in srgb, ${hairColor} 90%, black)`}
          strokeWidth={options.eyebrows === 'thick' ? '4' : options.eyebrows === 'thin' ? '2' : '3'}
          strokeLinecap="round"
        />
      </g>

      {/* Eyes */}
      <g>
        {/* Left eye white */}
        <ellipse
          cx={leftEyeX}
          cy={eyeY}
          rx={eyeSize + 5}
          ry={eyeSize + 3}
          fill="white"
        />
        {/* Left iris */}
        <circle
          cx={leftEyeX}
          cy={eyeY}
          r={eyeSize * 0.7}
          fill="#3B82F6"
        />
        {/* Left pupil */}
        <circle
          cx={leftEyeX + 2}
          cy={eyeY}
          r={eyeSize * 0.4}
          fill="#1A1A1A"
        />
        {/* Left eye highlight */}
        <circle
          cx={leftEyeX + 3}
          cy={eyeY - 3}
          r={eyeSize * 0.2}
          fill="white"
          opacity="0.9"
        />
        
        {/* Right eye white */}
        <ellipse
          cx={rightEyeX}
          cy={eyeY}
          rx={eyeSize + 5}
          ry={eyeSize + 3}
          fill="white"
        />
        {/* Right iris */}
        <circle
          cx={rightEyeX}
          cy={eyeY}
          r={eyeSize * 0.7}
          fill="#3B82F6"
        />
        {/* Right pupil */}
        <circle
          cx={rightEyeX + 2}
          cy={eyeY}
          r={eyeSize * 0.4}
          fill="#1A1A1A"
        />
        {/* Right eye highlight */}
        <circle
          cx={rightEyeX + 3}
          cy={eyeY - 3}
          r={eyeSize * 0.2}
          fill="white"
          opacity="0.9"
        />

        {/* Eyelashes */}
        <g stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round">
          <line x1={leftEyeX - eyeSize - 3} y1={eyeY - eyeSize - 2} x2={leftEyeX - eyeSize - 7} y2={eyeY - eyeSize - 6} />
          <line x1={leftEyeX + eyeSize + 3} y1={eyeY - eyeSize - 2} x2={leftEyeX + eyeSize + 7} y2={eyeY - eyeSize - 6} />
          <line x1={rightEyeX - eyeSize - 3} y1={eyeY - eyeSize - 2} x2={rightEyeX - eyeSize - 7} y2={eyeY - eyeSize - 6} />
          <line x1={rightEyeX + eyeSize + 3} y1={eyeY - eyeSize - 2} x2={rightEyeX + eyeSize + 7} y2={eyeY - eyeSize - 6} />
        </g>
      </g>

      {/* Nose */}
      <g stroke={darkerSkin} strokeWidth="2" fill="none" strokeLinecap="round">
        <path d={`M ${center} ${noseY - 15} L ${center} ${noseY + 8}`} />
        <path d={`M ${center} ${noseY + 8} Q ${center - 6} ${noseY + 12} ${center - 8} ${noseY + 6}`} />
        <path d={`M ${center} ${noseY + 8} Q ${center + 6} ${noseY + 12} ${center + 8} ${noseY + 6}`} />
      </g>

      {/* Mouth */}
      <g>
        {options.mouth === 'smile' && (
          <>
            <path
              d={`M ${center - 35} ${mouthY} Q ${center} ${mouthY + 22} ${center + 35} ${mouthY}`}
              stroke="#D97D7D"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={`M ${center - 30} ${mouthY + 2} Q ${center} ${mouthY + 18} ${center + 30} ${mouthY + 2}`}
              stroke="white"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              opacity="0.6"
            />
          </>
        )}
        
        {options.mouth === 'neutral' && (
          <line
            x1={center - 28}
            y1={mouthY + 5}
            x2={center + 28}
            y2={mouthY + 5}
            stroke="#D97D7D"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}
        
        {options.mouth === 'grin' && (
          <>
            <path
              d={`M ${center - 40} ${mouthY} Q ${center} ${mouthY + 28} ${center + 40} ${mouthY}`}
              stroke="#D97D7D"
              strokeWidth="2.5"
              fill="white"
              strokeLinecap="round"
            />
            {/* Teeth */}
            <rect x={center - 20} y={mouthY + 8} width="8" height="10" fill="white" />
            <rect x={center - 10} y={mouthY + 8} width="8" height="10" fill="white" />
            <rect x={center + 2} y={mouthY + 8} width="8" height="10" fill="white" />
            <rect x={center + 12} y={mouthY + 8} width="8" height="10" fill="white" />
          </>
        )}
        
        {options.mouth === 'laugh' && (
          <>
            <ellipse
              cx={center}
              cy={mouthY + 8}
              rx="32"
              ry="22"
              fill="#D97D7D"
            />
            <ellipse
              cx={center}
              cy={mouthY + 5}
              rx="28"
              ry="18"
              fill="white"
            />
          </>
        )}
        
        {options.mouth === 'serious' && (
          <line
            x1={center - 25}
            y1={mouthY + 8}
            x2={center + 25}
            y2={mouthY + 8}
            stroke="#D97D7D"
            strokeWidth="3"
            strokeLinecap="round"
          />
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
};

export default AvatarRenderer;
