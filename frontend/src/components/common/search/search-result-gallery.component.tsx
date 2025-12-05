import { Link } from 'react-router-dom';
import { optimizeProfilePicture } from '@utils/cloudinary-transform.util';
import type { GallerySearchResult } from '@services/search.service';

interface SearchResultGalleryProps {
  gallery: GallerySearchResult;
  query?: string;
}

export const SearchResultGallery = ({ gallery, query }: SearchResultGalleryProps) => {
  // Add low quality transformation to gallery images
  const getLowQualityImage = (url: string | null | undefined): string | undefined => {
    if (!url || !url.includes('cloudinary.com')) {
      return url || undefined;
    }
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      return `${parts[0]}/upload/q_auto:low,f_auto/${parts[1]}`;
    }
    return url;
  };

  // Use creator ID for URL instead of gallery_id
  const galleryUrl = gallery.creator_id ? `/gallery/${gallery.creator_id}` : `/gallery/${gallery.gallery_id}`;

  return (
    <Link
      to={galleryUrl}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors"
    >
      {gallery.picture && (
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={getLowQualityImage(gallery.picture)}
            alt={gallery.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-base-content truncate">
          {gallery.title}
        </p>
        {gallery.description && (
          <p className="text-xs text-base-content/60 line-clamp-1">
            {gallery.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1">
          <div className="w-5 h-5 rounded-full overflow-hidden">
            <img
              src={optimizeProfilePicture(gallery.creator_profile_picture) || '/static/images/default-pic-min.jpg'}
              alt={gallery.creator_username}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-base-content/50">@{gallery.creator_username}</p>
        </div>
      </div>
    </Link>
  );
};

