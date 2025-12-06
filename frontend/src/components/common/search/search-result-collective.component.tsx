import { Link } from 'react-router-dom';
import type { CollectiveSearchResult } from '@services/search.service';

interface SearchResultCollectiveProps {
  collective: CollectiveSearchResult;
  query?: string;
}

export const SearchResultCollective = ({ collective }: SearchResultCollectiveProps) => {
  // Add low quality transformation to collective picture
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

  return (
    <Link
      to={`/collective/${collective.collective_id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors"
    >
      {collective.picture && (
        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={getLowQualityImage(collective.picture)}
            alt={collective.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-base-content truncate">
          {collective.title}
        </p>
        {collective.description && (
          <p className="text-xs text-base-content/60 line-clamp-1">
            {collective.description}
          </p>
        )}
        <p className="text-xs text-base-content/50 mt-1">
          {collective.member_count} {collective.member_count === 1 ? 'member' : 'members'}
        </p>
      </div>
    </Link>
  );
};

