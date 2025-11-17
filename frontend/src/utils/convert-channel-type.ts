/**
 * Converts frontend display channel type to backend snake_case format
 */
export const convertChannelTypeToSnakeCase = (
  displayType: 'Post Channel' | 'Media Channel' | 'Event Channel'
): 'post_channel' | 'media_channel' | 'event_channel' => {
  const mapping: Record<
    'Post Channel' | 'Media Channel' | 'Event Channel',
    'post_channel' | 'media_channel' | 'event_channel'
  > = {
    'Post Channel': 'post_channel',
    'Media Channel': 'media_channel',
    'Event Channel': 'event_channel',
  };

  return mapping[displayType];
};

/**
 * Converts backend snake_case channel type to frontend display format
 */
export const convertChannelTypeToDisplay = (
  snakeCase: 'post_channel' | 'media_channel' | 'event_channel'
): 'Post Channel' | 'Media Channel' | 'Event Channel' => {
  const mapping: Record<
    'post_channel' | 'media_channel' | 'event_channel',
    'Post Channel' | 'Media Channel' | 'Event Channel'
  > = {
    post_channel: 'Post Channel',
    media_channel: 'Media Channel',
    event_channel: 'Event Channel',
  };

  return mapping[snakeCase];
};

