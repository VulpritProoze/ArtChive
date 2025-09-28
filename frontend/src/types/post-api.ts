export type FetchPost = (
    page: number,
    append: boolean,
    channel_id?: string,
    user_id?: number,
) => Promise<void>