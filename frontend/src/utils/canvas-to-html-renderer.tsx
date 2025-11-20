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
    console.log(`[RENDER] Skipping invisible object: ${object.type} (${object.id})`);
    return <></>;
  }

  const baseStyles: React.CSSProperties = {
    position: 'absolute',
    left: `${object.x * scale}px`,
    top: `${object.y * scale}px`,
    ...applyTransformStyles(object),
  };

  // Log base positioning info for all objects
  console.log(`[RENDER] ${object.type.toUpperCase()} - ID: ${object.id}`, {
    originalPosition: { x: object.x, y: object.y },
    scaledPosition: { left: object.x * scale, top: object.y * scale },
    scale: scale,
    rotation: object.rotation,
    opacity: object.opacity ?? 1,
    zIndex: object.zIndex ?? 0,
    visible: object.visible ?? true,
  });

  switch (object.type) {
    case 'text': {
      const textObj = object as TextObject;
      console.log(`  ↳ TEXT Details:`, {
        text: textObj.text,
        originalSize: { fontSize: textObj.fontSize, width: textObj.width },
        scaledSize: { fontSize: textObj.fontSize ? textObj.fontSize * scale : undefined, width: textObj.width ? textObj.width * scale : undefined },
        fontFamily: textObj.fontFamily,
        fill: textObj.fill,
        align: textObj.align,
      });
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

      console.log(`  ↳ IMAGE Details:`, {
        src: imageObj.src,
        originalSize: { width: imageObj.width, height: imageObj.height },
        scaledSize: { width: imageObj.width * scale, height: imageObj.height * scale },
        crop: imageObj.cropX !== undefined ? {
          original: { x: imageObj.cropX, y: imageObj.cropY, width: imageObj.cropWidth, height: imageObj.cropHeight },
          scaled: { x: imageObj.cropX * scale, y: imageObj.cropY * scale, width: imageObj.cropWidth! * scale, height: imageObj.cropHeight! * scale }
        } : 'none',
      });

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
      console.log(`  ↳ RECT Details:`, {
        originalSize: { width: rectObj.width, height: rectObj.height },
        scaledSize: { width: rectObj.width * scale, height: rectObj.height * scale },
        fill: rectObj.fill,
        stroke: rectObj.stroke,
        strokeWidth: rectObj.strokeWidth,
        cornerRadius: rectObj.cornerRadius,
      });
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
      console.log(`  ↳ CIRCLE Details:`, {
        originalRadius: circleObj.radius,
        scaledRadius: circleObj.radius * scale,
        scaledDiameter: diameter,
        fill: circleObj.fill,
        stroke: circleObj.stroke,
        strokeWidth: circleObj.strokeWidth,
      });
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
        console.log(`  ↳ LINE Skipped: Not enough points`);
        return <></>;
      }
      const [x1, y1, x2, y2] = lineObj.points;
      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) * scale;
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

      console.log(`  ↳ LINE Details:`, {
        originalPoints: { x1, y1, x2, y2 },
        scaledPoints: { x1: x1 * scale, y1: y1 * scale, x2: x2 * scale, y2: y2 * scale },
        originalLength: Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)),
        scaledLength: length,
        angle: angle,
        stroke: lineObj.stroke,
        strokeWidth: lineObj.strokeWidth,
      });

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
      console.log(`  ↳ GROUP/GALLERY-ITEM Details:`, {
        originalSize: { width: groupObj.width, height: groupObj.height },
        scaledSize: { width: groupObj.width * scale, height: groupObj.height * scale },
        childrenCount: groupObj.children?.length || 0,
        background: (groupObj as GalleryItemObject).background,
        borderColor: (groupObj as GalleryItemObject).borderColor,
        borderWidth: (groupObj as GalleryItemObject).borderWidth,
      });
      console.log(`  ↳ GROUP Children (${groupObj.children?.length || 0}):`);
      return (
        <div
          key={object.id}
          style={{
            ...baseStyles,
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
      console.log(`  ↳ FRAME Details:`, {
        originalSize: { width: frameObj.width, height: frameObj.height },
        scaledSize: { width: frameObj.width * scale, height: frameObj.height * scale },
        childrenCount: frameObj.children?.length || 0,
        stroke: frameObj.stroke,
        strokeWidth: frameObj.strokeWidth,
        fill: frameObj.fill,
        dashEnabled: frameObj.dashEnabled,
        placeholder: frameObj.placeholder,
      });
      console.log(`  ↳ FRAME Children (${frameObj.children?.length || 0}):`);
      return (
        <div
          key={object.id}
          style={{
            ...baseStyles,
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

