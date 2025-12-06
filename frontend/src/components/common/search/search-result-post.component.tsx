import { Link } from 'react-router-dom';
import { optimizeProfilePicture } from '@utils/cloudinary-transform.util';
import type { PostSearchResult } from '@services/search.service';

interface SearchResultPostProps {
  post: PostSearchResult;
  query?: string;
}

export const SearchResultPost = ({ post }: SearchResultPostProps) => {
  // Add low quality transformation to post image
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
      to={`/post/${post.post_id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors"
    >
      {post.image_url && (
        <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={getLowQualityImage(post.image_url)}
            alt={post.description || 'Post'}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {post.post_type && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/20 text-primary capitalize">
              {post.post_type}
            </span>
          )}
        </div>
        <p className="text-sm text-base-content line-clamp-2">
          {post.description || 'No description'}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-6 h-6 rounded-full overflow-hidden">
            <img
              src={optimizeProfilePicture(post.author_profile_picture) || '/static/images/default-pic-min.jpg'}
              alt={post.author_username}
              className="w-full h-full object-cover"
            />
          </div>
          <p className="text-xs text-base-content/60">@{post.author_username}</p>
        </div>
      </div>
    </Link>
  );
};

