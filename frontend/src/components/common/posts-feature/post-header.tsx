import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisH,
  faEdit,
  faTrash,
  faEye,
} from "@fortawesome/free-solid-svg-icons";
import type { Post } from "@types";
import { formatArtistTypesToString } from "@utils";
import { useAuth } from "@context/auth-context";
import { useLocation, Link } from "react-router-dom";
import { usePostUI } from "@context/post-ui-context";
import { useDeletePost } from "@hooks/mutations/use-post-mutations";
import { toast } from "@utils/toast.util";
import { handleApiError, formatErrorForToast } from "@utils";

export default function PostHeader({
  postItem,
  IsCommentViewModal = false,
}: {
  postItem: Post;
  IsCommentViewModal?: boolean;
}) {
  const { user } = useAuth();
  const location = useLocation();
  const { dropdownOpen, setDropdownOpen, openPostForm } = usePostUI();
  const { mutateAsync: deletePost, isPending: isDeletingPost } = useDeletePost();

  // Check if current user is the author or admin
  const isAuthor = user?.id === postItem.author;
  const isAdmin = user?.is_superuser;
  const canEdit = isAuthor; // Only author can edit
  const canDelete = isAuthor || isAdmin; // Author or admin can delete
  // Show dropdown for everyone, but edit/delete options are conditionally shown
  
  // Check if we're already on the post detail page
  const isOnPostDetailPage = location.pathname === `/post/${postItem.post_id}`;

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

        {/* Show dropdown for everyone (not in comment modal) */}
        {!IsCommentViewModal && (
          <div className="dropdown dropdown-end">
            <button
              className="btn btn-ghost btn-sm btn-circle"
              onClick={() =>
                setDropdownOpen(dropdownOpen === postItem.post_id ? null : postItem.post_id)
              }
            >
              <FontAwesomeIcon icon={faEllipsisH} />
            </button>

            {dropdownOpen === postItem.post_id && (
              <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-48 border border-base-300">
                {/* Only show "View in Detail" if NOT already on post detail page */}
                {!isOnPostDetailPage && (
                  <li>
                    <Link
                      to={`/post/${postItem.post_id}`}
                      className="text-sm flex items-center gap-2"
                      onClick={() => setDropdownOpen(null)}
                    >
                      <FontAwesomeIcon icon={faEye} />
                      View in Detail
                    </Link>
                  </li>
                )}
                {canEdit && (
                  <li>
                    <button
                      className="text-sm flex items-center gap-2"
                      onClick={() => {
                        openPostForm(postItem);
                        setDropdownOpen(null);
                      }}
                    >
                      <FontAwesomeIcon icon={faEdit} />
                      Edit
                    </button>
                  </li>
                )}
                {canDelete && (
                  <li>
                    <button
                      className="text-sm text-error flex items-center gap-2"
                      onClick={async () => {
                        if (!window.confirm("Are you sure you want to delete this post?")) return;
                        try {
                          await deletePost({ postId: postItem.post_id });
                          toast.success("Post deleted", "The post has been removed successfully");
                        } catch (error) {
                          const message = handleApiError(error, {}, true, true);
                          toast.error("Failed to delete post", formatErrorForToast(message));
                        } finally {
                          setDropdownOpen(null);
                        }
                      }}
                      disabled={isDeletingPost}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      {isDeletingPost ? "Deleting..." : "Delete"}
                    </button>
                  </li>
                )}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
