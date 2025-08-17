// src/components/ImageWithSkeleton.tsx
import { useState, useEffect, useRef } from 'react';
import { useImageCache } from '@context/image-cache-context';

export function ImageWithSkeleton({ src, alt, className }: { 
  src: string; 
  alt: string; 
  className?: string 
}) {
  const [loaded, setLoaded] = useState(false);
  const { cache } = useImageCache();
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!cache.current) cache.current = {};

    // Check if image is already in our cache
    if (cache.current[src]) {
      setLoaded(true);
      return;
    }

    // Check if image is already loaded in DOM
    if (imgRef.current?.complete) {
      cache.current[src] = imgRef.current;
      setLoaded(true);
      return;
    }

    // Preload image if not in cache
    const img = new Image();
    img.src = src;
    img.onload = () => {
      cache.current[src] = img;
      setLoaded(true);
    };
    img.onerror = () => setLoaded(true); // Fallback if image fails

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, cache]);

  return (
    <div className={`relative ${className}`}>
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200" />
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={`${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}