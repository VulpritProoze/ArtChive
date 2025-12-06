import { BestGalleriesCarouselSingle } from './best-galleries-carousel-single.component';
import { BestGalleriesCarouselMulti } from './best-galleries-carousel-multi.component';
import type { GalleryListItem } from '@types';

interface BestGalleriesSectionProps {
  galleries: GalleryListItem[];
  isLoading: boolean;
  isSmallScreen: boolean;
}

export const BestGalleriesSection = ({ galleries, isLoading, isSmallScreen }: BestGalleriesSectionProps) => {
  return (
    <>
      {isSmallScreen ? (
        <BestGalleriesCarouselSingle 
          galleries={galleries}
          isLoading={isLoading}
        />
      ) : (
        <BestGalleriesCarouselMulti 
          galleries={galleries}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

