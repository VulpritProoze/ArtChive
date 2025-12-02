import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faCheckDouble, faTrash, faBell } from '@fortawesome/free-solid-svg-icons';
import { useNotifications } from '@context/realtime-context';
import type { Notification } from '@types';
import { MainLayout } from '@components/common/layout/MainLayout';

// Helper function to format time ago
const formatTimeAgo = (date: string): string => {
  const now = new Date();
  const notifiedDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - notifiedDate.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
};

export default function NotificationIndex() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const handleDelete = async (notificationId: string) => {
    await deleteNotification(notificationId);
  };

  const getNotificationLink = (notification: Notification): string => {
    const type = notification.notification_object_type;
    const objectId = notification.notification_object_id;

    switch (type) {
      case 'Post Comment':
        // Link to the post with the comment hash
        // objectId format: "postId:commentId" or just "commentId"
        if (objectId.includes(':')) {
          const [postId, commentId] = objectId.split(':');
          // Check if it's a reply (nested comment)
          const isReply = notification.message.includes('replied to your comment');
          return `/post/${postId}#${isReply ? 'reply' : 'comment'}-${commentId}`;
        }
        return `/post/${objectId}`;
      case 'Post Critique':
        // objectId format: "postId:critiqueId" or just "critiqueId"
        if (objectId.includes(':')) {
          const [postId, critiqueId] = objectId.split(':');
          // Check if it's a critique reply
          const isCritiqueReply = notification.message.includes('replied to your critique');
          return `/post/${postId}#${isCritiqueReply ? 'critique-reply' : 'critique'}-${critiqueId}`;
        }
        return `/post/${objectId}`;
      case 'Post Praise':
        return `/post/${objectId}`;
      case 'Post Trophy':
        return `/post/${objectId}`;
      case 'Friend Request Accepted':
        // objectId is the friend request ID, but we want to go to the user's profile
        // For now, navigate to fellows requests page
        return '/fellows/requests';
      default:
        return '/notifications';
    }
  };

  const getNotificationIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'Post Comment':
        return '💬';
      case 'Post Critique':
        return '🎨';
      case 'Post Praise':
        return '👏';
      case 'Post Trophy':
        return '🏆';
      case 'Friend Request Accepted':
        return '👥';
      default:
        return '🔔';
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-base-content">Notifications</h1>
            <p className="text-base-content/60 mt-1">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn btn-primary btn-sm gap-2"
            >
              <FontAwesomeIcon icon={faCheckDouble} />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-base-100 rounded-lg shadow-lg border border-base-300">
          {notifications.length === 0 ? (
            <div className="py-16 text-center">
              <FontAwesomeIcon icon={faBell} className="text-6xl text-base-content/20 mb-4" />
              <h3 className="text-xl font-semibold text-base-content mb-2">No notifications yet</h3>
              <p className="text-base-content/60">When you get notifications, they'll show up here</p>
            </div>
          ) : (
            <div className="divide-y divide-base-300">
              {notifications.map((notification) => (
                <div
                  key={notification.notification_id}
                  className={`p-4 hover:bg-base-200 transition-colors ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      {notification.notified_by?.profile_picture ? (
                        <img
                          src={notification.notified_by.profile_picture}
                          alt={notification.notified_by.full_name}
                          className="w-14 h-14 rounded-full border-2 border-base-300"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-base-300 flex items-center justify-center text-3xl">
                          {getNotificationIcon(notification.notification_object_type)}
                        </div>
                      )}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <Link
                            to={getNotificationLink(notification)}
                            className="block hover:underline"
                          >
                            <p className="text-base text-base-content mb-1">
                              <span className="font-semibold">
                                {notification.notified_by?.full_name || 'Someone'}
                              </span>
                              {' '}
                              {notification.message.replace(notification.notified_by?.full_name || '', '').trim()}
                            </p>
                          </Link>
                          <div className="flex items-center gap-3 text-sm text-base-content/60">
                            <span>{formatTimeAgo(notification.notified_at)}</span>
                            <span>•</span>
                            <span className="text-primary">{notification.notification_object_type}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.notification_id)}
                              className="btn btn-ghost btn-sm gap-2"
                              title="Mark as read"
                            >
                              <FontAwesomeIcon icon={faCheck} />
                              Mark as read
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.notification_id)}
                            className="btn btn-ghost btn-sm text-error hover:bg-error/10"
                            title="Delete"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </div>

                      {/* Unread Indicator */}
                      {!notification.is_read && (
                        <div className="mt-2">
                          <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold">
                            <span className="w-2 h-2 rounded-full bg-primary"></span>
                            Unread
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}