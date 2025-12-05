import { Link } from 'react-router-dom';
import { optimizeProfilePicture } from '@utils/cloudinary-transform.util';
import type { UserSearchResult } from '@services/search.service';

interface SearchResultUserProps {
  user: UserSearchResult;
  query?: string;
}

export const SearchResultUser = ({ user, query }: SearchResultUserProps) => {
  return (
    <Link
      to={`/profile/@${user.username}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors"
    >
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
        <img
          src={optimizeProfilePicture(user.profile_picture) || '/static/images/default-pic-min.jpg'}
          alt={user.username}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-base-content truncate">
          {user.fullname || user.username}
        </p>
        <p className="text-xs text-base-content/60 truncate">@{user.username}</p>
        {user.artist_types && user.artist_types.length > 0 && (
          <p className="text-xs text-base-content/50 truncate">
            {user.artist_types.join(', ')}
          </p>
        )}
      </div>
    </Link>
  );
};

