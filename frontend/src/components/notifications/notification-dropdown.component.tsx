import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '@context/notification-context';
import type { Notification } from '@types';

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

export default function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.notification_id);
    }
    setIsOpen(false);
    // Navigation will be handled by the Link component
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await markAllAsRead();
  };

  const handleDeleteNotification = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    e.preventDefault();
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
      default:
        return '🔔';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative btn btn-ghost btn-circle btn-sm hover:bg-base-200"
        title="Notifications"
      >
        <Bell className="w-5 h-5 flex-shrink-0" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-error text-error-content text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-4 w-96 bg-base-100 rounded-lg shadow-2xl border border-base-300 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-base-300 flex items-center justify-between sticky top-0 bg-base-100 rounded-t-lg">
            <h3 className="text-lg font-bold text-base-content">
              <Link to="/notifications" className="link-hover">Notifications</Link>
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-primary hover:text-primary-focus flex items-center gap-1"
              >
                <CheckCheck className="w-4 h-4 flex-shrink-0" />
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-base-content/60">
                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Link
                  key={notification.notification_id}
                  to={getNotificationLink(notification)}
                  onClick={() => handleNotificationClick(notification)}
                  className={`block px-4 py-3 border-b border-base-300 hover:bg-base-200 transition-colors ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* User Avatar */}
                    <div className="flex-shrink-0">
                      {notification.notified_by?.profile_picture ? (
                        <img
                          src={notification.notified_by.profile_picture}
                          alt={notification.notified_by.full_name}
                          className="w-12 h-12 rounded-full border-2 border-base-300"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-base-300 flex items-center justify-center text-2xl">
                          {getNotificationIcon(notification.notification_object_type)}
                        </div>
                      )}
                    </div>

                    {/* Notification Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm text-base-content">
                            <span className="font-semibold">
                              {notification.notified_by?.full_name || 'Someone'}
                            </span>
                            {' '}
                            {notification.message.replace(notification.notified_by?.full_name || '', '').trim()}
                          </p>
                          <p className="text-xs text-base-content/60 mt-1">
                            {formatTimeAgo(notification.notified_at)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.is_read && (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                markAsRead(notification.notification_id);
                              }}
                              className="text-primary hover:text-primary-focus"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4 flex-shrink-0" />
                            </button>
                          )}
                          <button
                            onClick={(e) => handleDeleteNotification(e, notification.notification_id)}
                            className="text-base-content/40 hover:text-error"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 flex-shrink-0" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {!notification.is_read && (
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2"></div>
                      </div>
                    )}
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Footer - View All Link */}
          {notifications.length > 0 && (
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="px-4 py-3 text-center text-sm text-primary hover:bg-base-200 border-t border-base-300 sticky bottom-0 bg-base-100 rounded-b-lg"
            >
              View all notifications
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
