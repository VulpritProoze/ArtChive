import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisH,
  faEdit,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import type { Post } from "@types";
import { formatArtistTypesToString } from "@utils";
import usePost from "@hooks/use-post";
import { usePostContext } from "@context/post-context";
import { useAuth } from "@context/auth-context"; // 👈 Import useAuth

export default function PostHeader({
  postItem,
  IsCommentViewModal = false,
}: {
  postItem: Post;
  IsCommentViewModal?: boolean;
}) {
  const { toggleDropdown, handleEditPost, handleDeletePost } = usePost();
  const { dropdownOpen } = usePostContext();
  const { user } = useAuth(); // 👈 Get current user

  // Check if current user is the author
  const isAuthor = user?.id === postItem.author;
  const isAdmin = user?.is_superuser;
  const canEdit = isAuthor || isAdmin

  return (
    <>
      <div
        className={
          IsCommentViewModal
            ? `flex items-center justify-between px-4 py-3`
            : `flex items-center justify-between px-4 py-3 border-b border-base-300`
        }
      >
        <div className="flex items-center gap-3">
          <img
            src={postItem.author_picture}
            alt="author_pic"
            className="w-8 h-8 rounded-full border border-base-300"
          />
          <div>
            <p className="text-sm font-semibold text-base-content">
              {postItem.author_fullname}
            </p>
            <p className="text-xs text-base-content/70">
              {formatArtistTypesToString(postItem.author_artist_types)}
            </p>
          </div>
        </div>

        {/* Only show dropdown if: not in comment modal AND user can edit */}
        {!IsCommentViewModal && canEdit && (
          <div className="dropdown dropdown-end">
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() => toggleDropdown(postItem.post_id)}
            >
              <FontAwesomeIcon icon={faEllipsisH} />
            </button>

            {dropdownOpen === postItem.post_id && (
              <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-32 border border-base-300">
                <li>
                  <button
                    className="text-sm flex items-center gap-2"
                    onClick={() => handleEditPost(postItem)}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                    Edit
                  </button>
                </li>
                <li>
                  <button
                    className="text-sm text-error flex items-center gap-2"
                    onClick={() => handleDeletePost(postItem.post_id)}
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    Delete
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
