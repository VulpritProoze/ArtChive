import type { ArtistType } from "./artist-type.type"

export type Artwork = {
    id: string | number
    title: string
    artist: string
    artistType: ArtistType
    imageUrl: string
    year: number | string
    description: string
    likes: number
}