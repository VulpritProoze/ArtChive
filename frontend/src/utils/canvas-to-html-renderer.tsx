import React from 'react';
import type { CanvasObject, BaseCanvasObject, TextObject, ImageObject, RectObject, CircleObject, LineObject, GroupObject, FrameObject, GalleryItemObject } from '@types';
import type { TriangleObject, StarObject, DiamondObject } from '@types';

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
      
      // Check if text is a hyperlink using isHyperlink property
      const isHyperlink = textObj.isHyperlink === true;
      
      // Extract URL from text and ensure it's an absolute URL
      const extractUrl = (text: string): string => {
        const trimmedText = text.trim();
        
        // Check if text is already an absolute URL with protocol
        if (/^https?:\/\//i.test(trimmedText)) {
          return trimmedText;
        }
        
        // Check if text starts with www.
        if (/^www\./i.test(trimmedText)) {
          return `https://${trimmedText}`;
        }
        
        // Check if text looks like a domain (contains dots and no spaces)
        if (/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}/.test(trimmedText) && !trimmedText.includes(' ')) {
          return `https://${trimmedText}`;
        }
        
        // For relative paths, make them absolute by prepending current origin
        if (trimmedText.startsWith('/')) {
          return `${window.location.origin}${trimmedText}`;
        }
        
        // If text doesn't look like a URL or path, don't make it a link
        // Return empty string to prevent rendering as link
        return '';
      };

      const href = isHyperlink ? extractUrl(textObj.text) : undefined;
      
      // Only use width as a soft constraint (maxWidth) for wrapping, not a hard constraint
      // This allows text to grow naturally but wrap if width is specified
      const textStyles: React.CSSProperties = {
        ...baseStyles,
        fontSize: textObj.fontSize ? `${textObj.fontSize * scale}px` : undefined,
        fontFamily: textObj.fontFamily,
        color: textObj.fill,
        fontStyle: textObj.fontStyle,
        textDecoration: textObj.textDecoration,
        textAlign: textObj.align as React.CSSProperties['textAlign'],
        whiteSpace: textObj.width ? 'pre-wrap' : 'pre', // Only wrap if width is set
        wordWrap: 'break-word',
        overflowWrap: 'break-word',
        overflow: 'visible',
        lineHeight: '1.2',
        textDecorationColor: isHyperlink ? textObj.fill : undefined,
      };

      // Only set maxWidth if width is specified (for wrapping), but don't constrain with fixed width
      if (textObj.width) {
        textStyles.maxWidth = `${textObj.width * scale}px`;
      }

      // Render as <a> tag if hyperlink and valid URL extracted, otherwise <div>
      if (isHyperlink && href) {
        return (
          <a
            key={object.id}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            style={textStyles}
          >
            {textObj.text}
          </a>
        );
      }

      return (
        <div
          key={object.id}
          style={textStyles}
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
        imageStyles.objectPosition = `${-imageObj.cropX * scale}px ${-(imageObj.cropY ?? 0) * scale}px`;
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
      const scaledRadius = circleObj.radius * scale;
      const diameter = scaledRadius * 2;
      // Adjust positioning: circle center is at (x, y), but div's top-left is positioned
      // So we need to offset by radius to center the circle
      const adjustedLeft = (object.x - circleObj.radius) * scale;
      const adjustedTop = (object.y - circleObj.radius) * scale;
      
      return (
        <div
          key={object.id}
          style={{
            position: 'absolute',
            left: `${adjustedLeft}px`,
            top: `${adjustedTop}px`,
            width: `${diameter}px`,
            height: `${diameter}px`,
            borderRadius: '50%',
            backgroundColor: circleObj.fill,
            border: circleObj.stroke
              ? `${(circleObj.strokeWidth || 1) * scale}px solid ${circleObj.stroke}`
              : undefined,
            transformOrigin: 'center center',
            ...applyTransformStyles(object),
          }}
        />
      );
    }

    case 'line': {
      const lineObj = object as LineObject;
      if (lineObj.points.length < 4) {
        return <></>;
      }
      
      // Points are relative to line position (x, y)
      // Convert to absolute coordinates
      const absolutePoints: number[] = [];
      for (let i = 0; i < lineObj.points.length; i += 2) {
        absolutePoints.push((lineObj.x + lineObj.points[i]) * scale);
        absolutePoints.push((lineObj.y + lineObj.points[i + 1]) * scale);
      }

      // Calculate bounding box for SVG
      const xCoords = absolutePoints.filter((_, i) => i % 2 === 0);
      const yCoords = absolutePoints.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);
      const svgWidth = Math.max(1, maxX - minX);
      const svgHeight = Math.max(1, maxY - minY);

      // Convert absolute points to SVG path (relative to bounding box)
      let pathData = '';
      for (let i = 0; i < absolutePoints.length; i += 2) {
        const x = absolutePoints[i] - minX;
        const y = absolutePoints[i + 1] - minY;
        if (i === 0) {
          pathData = `M ${x} ${y}`;
        } else {
          pathData += ` L ${x} ${y}`;
        }
      }

      const strokeWidth = (lineObj.strokeWidth || 1) * scale;
      const strokeColor = lineObj.stroke || '#000000';

      return (
        <svg
          key={object.id}
          style={{
            position: 'absolute',
            left: `${minX}px`,
            top: `${minY}px`,
            width: `${svgWidth}px`,
            height: `${svgHeight}px`,
            pointerEvents: 'none',
            overflow: 'visible',
            ...applyTransformStyles(object),
          }}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        >
          <path
            d={pathData}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth / scale}
            strokeLinecap={(lineObj.lineCap || 'round') as 'butt' | 'round' | 'square' | 'inherit'}
            strokeLinejoin={(lineObj.lineJoin || 'round') as 'miter' | 'round' | 'bevel' | 'inherit'}
          />
        </svg>
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

    // @ts-expect-error - triangle/star/diamond are in gallery.type.ts but not canvas.ts
    case 'triangle':
    // @ts-expect-error - triangle/star/diamond are in gallery.type.ts but not canvas.ts
    case 'diamond':
    // @ts-expect-error - triangle/star/diamond are in gallery.type.ts but not canvas.ts
    case 'star': {
      // Type assertion needed because triangle/star/diamond are in gallery.type.ts but not canvas.ts
      const shapeObj = object as unknown as TriangleObject | DiamondObject | StarObject;
      if (!shapeObj.points || shapeObj.points.length < 4) {
        return <></>;
      }

      // Points are relative to object position (x, y)
      // Calculate bounding box of points for SVG dimensions
      const xCoords = shapeObj.points.filter((_, i) => i % 2 === 0);
      const yCoords = shapeObj.points.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);
      const width = maxX - minX;
      const height = maxY - minY;

      // Convert points array to SVG path string (relative to bounding box)
      // Adjust points to be relative to (minX, minY) for viewBox
      let pathData = '';
      for (let i = 0; i < shapeObj.points.length; i += 2) {
        const x = shapeObj.points[i] - minX;
        const y = shapeObj.points[i + 1] - minY;
        if (i === 0) {
          pathData = `M ${x} ${y}`;
        } else {
          pathData += ` L ${x} ${y}`;
        }
      }

      // Close the path if it's a closed shape
      const finalPath = shapeObj.closed ? `${pathData} Z` : pathData;

      const strokeWidth = (shapeObj.strokeWidth || 1) * scale;
      const strokeColor = shapeObj.stroke || '#000000';
      const fillColor = shapeObj.fill || 'transparent';

      return (
        <svg
          key={shapeObj.id}
          style={{
            position: 'absolute',
            left: `${(shapeObj.x + minX) * scale}px`,
            top: `${(shapeObj.y + minY) * scale}px`,
            width: `${width * scale}px`,
            height: `${height * scale}px`,
            pointerEvents: 'none',
            overflow: 'visible',
            ...applyTransformStyles(shapeObj as unknown as BaseCanvasObject),
          }}
          viewBox={`0 0 ${width} ${height}`}
        >
          <path
            d={finalPath}
            fill={fillColor === 'transparent' ? 'none' : fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth / scale}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    default:
      return <></>;
  }
}

