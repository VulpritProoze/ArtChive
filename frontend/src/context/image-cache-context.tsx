// src/contexts/ImageCacheContext.tsx
import { createContext, useContext, useRef } from 'react';

type ImageCache = {
  [url: string]: HTMLImageElement;
};

const ImageCacheContext = createContext<{
  cache: React.RefObject<ImageCache>;
}>({ cache: { current: {} } });

export function ImageCacheProvider({ children }: { children: React.ReactNode }) {
  const cache = useRef<ImageCache>({});

  return (
    <ImageCacheContext.Provider value={{ cache }}>
      {children}
    </ImageCacheContext.Provider>
  );
}

export function useImageCache() {
  return useContext(ImageCacheContext);
}