import { formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Formats a date string into a relative time string (e.g. "2 hours ago")
 * or a formatted date string (e.g. "MMM d, yyyy") for older dates.
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return '';
  
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffInDays = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);

    if (diffInDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
};

