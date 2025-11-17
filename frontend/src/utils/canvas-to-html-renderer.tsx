import React from 'react';
import type { CanvasObject, BaseCanvasObject, TextObject, ImageObject, RectObject, CircleObject, LineObject, GroupObject, FrameObject, GalleryItemObject } from '@types';

/**
 * Calculate scale to fit viewport while maintaining aspect ratio
 * @param canvasWidth - Original canvas width
 * @param canvasHeight - Original canvas height
 * @param viewportWidth - Viewport width
 * @param viewportHeight - Viewport height
 * @returns Scale factor (max 1, never scales up)
 */
export function calculateScale(
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number
): number {
  const scaleX = viewportWidth / canvasWidth;
  const scaleY = viewportHeight / canvasHeight;
  return Math.min(scaleX, scaleY, 1); // Don't scale up
}

/**
 * Apply transform styles (rotation, scale, opacity, zIndex) to CSS properties
 * @param object - Canvas object with transform properties
 * @returns CSS properties object
 */
export function applyTransformStyles(
  object: BaseCanvasObject
): React.CSSProperties {
  const styles: React.CSSProperties = {
    opacity: object.opacity ?? 1,
    zIndex: object.zIndex ?? 0,
  };

  const transforms: string[] = [];

  if (object.rotation) {
    transforms.push(`rotate(${object.rotation}deg)`);
  }

  if (object.scaleX || object.scaleY) {
    transforms.push(`scale(${object.scaleX ?? 1}, ${object.scaleY ?? 1})`);
  }

  if (transforms.length > 0) {
    styles.transform = transforms.join(' ');
    styles.transformOrigin = 'top left';
  }

  return styles;
}

/**
 * Render a canvas object to HTML/JSX
 * @param object - Canvas object to render
 * @param scale - Scale factor for responsive sizing
 * @returns JSX element
 */
export function renderCanvasObjectToHTML(
  object: CanvasObject,
  scale: number
): React.ReactElement {
  // Skip invisible objects
  if (object.visible === false) {
    return <></>;
  }

  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    left: `${object.x * scale}px`,
    top: `${object.y * scale}px`,
    ...applyTransformStyles(object),
  };

  switch (object.type) {
    case 'text': {
      const textObj = object as TextObject;
      return (
        <div
          key={object.id}
          style={{
            ...baseStyles,
            fontSize: textObj.fontSize ? `${textObj.fontSize * scale}px` : undefined,
            fontFamily: textObj.fontFamily,
            color: textObj.fill,
            fontStyle: textObj.fontStyle,
            textDecoration: textObj.textDecoration,
            textAlign: textObj.align as React.CSSProperties['textAlign'],
            width: textObj.width ? `${textObj.width * scale}px` : undefined,
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
          }}
        >
          {textObj.text}
        </div>
      );
    }

    case 'image': {
      const imageObj = object as ImageObject;
      const imageStyles: React.CSSProperties = {
        ...baseStyles,
        width: `${imageObj.width * scale}px`,
        height: `${imageObj.height * scale}px`,
      };

      // Handle image cropping
      if (imageObj.cropX !== undefined && imageObj.cropY !== undefined && 
          imageObj.cropWidth !== undefined && imageObj.cropHeight !== undefined) {
        imageStyles.objectFit = 'none';
        imageStyles.objectPosition = `${-imageObj.cropX * scale}px ${-imageObj.cropY * scale}px`;
        imageStyles.width = `${imageObj.cropWidth * scale}px`;
        imageStyles.height = `${imageObj.cropHeight * scale}px`;
      }

      return (
        <img
          key={object.id}
          src={imageObj.src}
          alt=""
          style={imageStyles}
        />
      );
    }

    case 'rect': {
      const rectObj = object as RectObject;
      return (
        <div
          key={object.id}
          style={{
            ...baseStyles,
            width: `${rectObj.width * scale}px`,
            height: `${rectObj.height * scale}px`,
            backgroundColor: rectObj.fill,
            border: rectObj.stroke
              ? `${(rectObj.strokeWidth || 1) * scale}px solid ${rectObj.stroke}`
              : undefined,
            borderRadius: rectObj.cornerRadius ? `${rectObj.cornerRadius * scale}px` : undefined,
          }}
        />
      );
    }

    case 'circle': {
      const circleObj = object as CircleObject;
      const diameter = circleObj.radius * 2 * scale;
      return (
        <div
          key={object.id}
          style={{
            ...baseStyles,
            width: `${diameter}px`,
            height: `${diameter}px`,
            borderRadius: '50%',
            backgroundColor: circleObj.fill,
            border: circleObj.stroke
              ? `${(circleObj.strokeWidth || 1) * scale}px solid ${circleObj.stroke}`
              : undefined,
            transformOrigin: 'center center',
          }}
        />
      );
    }

    case 'line': {
      const lineObj = object as LineObject;
      if (lineObj.points.length < 4) {
        return <></>;
      }
      const [x1, y1, x2, y2] = lineObj.points;
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * scale;
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      
      // Combine rotation with existing transforms
      const existingTransform = baseStyles.transform || '';
      const combinedTransform = existingTransform 
        ? `${existingTransform} rotate(${angle}deg)`
        : `rotate(${angle}deg)`;
      
      return (
        <div
          key={object.id}
          style={{
            ...baseStyles,
            left: `${x1 * scale}px`,
            top: `${y1 * scale}px`,
            width: `${length}px`,
            height: `${(lineObj.strokeWidth || 1) * scale}px`,
            backgroundColor: lineObj.stroke || '#000000',
            transform: combinedTransform,
            transformOrigin: 'left center',
          }}
        />
      );
    }

    case 'group':
    case 'gallery-item': {
      const groupObj = object as GroupObject | GalleryItemObject;
      return (
        <div
          key={object.id}
          style={{
            ...baseStyles,
            position: 'relative',
            width: `${groupObj.width * scale}px`,
            height: `${groupObj.height * scale}px`,
            backgroundColor: (groupObj as GalleryItemObject).background,
            border: (groupObj as GalleryItemObject).borderColor
              ? `${((groupObj as GalleryItemObject).borderWidth || 1) * scale}px solid ${(groupObj as GalleryItemObject).borderColor}`
              : undefined,
          }}
        >
          {groupObj.children?.map((child) => renderCanvasObjectToHTML(child, scale))}
        </div>
      );
    }

    case 'frame': {
      const frameObj = object as FrameObject;
      const borderStyle = frameObj.dashEnabled ? 'dashed' : 'solid';
      return (
        <div
          key={object.id}
          style={{
            ...baseStyles,
            position: 'relative',
            width: `${frameObj.width * scale}px`,
            height: `${frameObj.height * scale}px`,
            border: frameObj.stroke
              ? `${(frameObj.strokeWidth || 1) * scale}px ${borderStyle} ${frameObj.stroke}`
              : undefined,
            backgroundColor: frameObj.fill,
          }}
        >
          {frameObj.children?.map((child) => renderCanvasObjectToHTML(child, scale))}
          {(!frameObj.children || frameObj.children.length === 0) && frameObj.placeholder && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#999',
                fontSize: `${14 * scale}px`,
              }}
            >
              {frameObj.placeholder}
            </div>
          )}
        </div>
      );
    }

    default:
      return <></>;
  }
}

