// Gallery List API Response Types

export interface CreatorDetails {
  id: number;
  username: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  profile_picture: string | null;
  artist_types: string[];
  brush_drips_count: number;
}

export interface GalleryListItem {
  gallery_id: string;
  title: string;
  description: string;
  status: string;
  picture: string;
  canvas_width: number;
  canvas_height: number;
  created_at: string;
  updated_at: string;
  creator_details: CreatorDetails;
}

export interface PaginatedGalleryListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GalleryListItem[];
}
