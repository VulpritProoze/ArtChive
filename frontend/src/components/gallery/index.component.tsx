import { Link, useNavigate } from "react-router-dom";
import { Info, ArrowRight, Images } from "lucide-react";
import { MainLayout } from "../common/layout";

interface GalleryCard {
  id: string;
  title: string;
  imageUrl?: string;
  artistName?: string;
  artistHandle?: string;
  artistType?: string;
  artistAvatar?: string;
  likes?: number;
  comments?: number;
}

// Available artwork images - using actual files from the folder
const artworkImages = [
  'artwork1.avif',
  'artwork2.avif',
  'artwork3.avif',
  'artwork4.avif',
  'artwork5.jpg',
  'artwork6.jpg',
  'artwork7.avif',
  'artwork8.jpg',
  'artwork9.jpg',
  'artwork10.jpg',
  'artwork11.jpg',
  'artwork12.jpg',
  'aw13.avif',
  'aw14.jpg',
  'aw15.jpg',
];

// Placeholder data - will be replaced with API calls later
const fellowsGalleries: GalleryCard[] = Array.from({ length: 10 }, (_, i) => ({
  id: `fellow-${i}`,
  title: `Gallery ${i + 1}`,
  imageUrl: `/landing-page/artworks/${artworkImages[i % artworkImages.length]}`,
}));

const bestGalleries: GalleryCard[] = Array.from({ length: 8 }, (_, i) => ({
  id: `best-${i}`,
  title: `Featured Gallery ${i + 1}`,
  imageUrl: `/landing-page/artworks/${artworkImages[(i + 2) % artworkImages.length]}`,
}));

const otherGalleries: GalleryCard[] = Array.from({ length: 6 }, (_, i) => ({
  id: `other-${i}`,
  title: `Gallery ${i + 1}`,
  artistName: `Artist ${i + 1}`,
  artistHandle: `@artist${i + 1}`,
  artistType: "Digital Artist",
  imageUrl: `/landing-page/artworks/${artworkImages[(i + 5) % artworkImages.length]}`,
}));

const GalleryIndex = () => {
  const navigate = useNavigate();

  const HorizontalScrollCard = ({ gallery, showAvatar = false }: { gallery: GalleryCard; showAvatar?: boolean }) => {
    const cardWidth = showAvatar ? 'w-56' : 'w-80';
    const cardHeight = showAvatar ? 'h-48' : 'h-64';
    const imageSrc = gallery.imageUrl || '/landing-page/artworks/artwork1.avif';

    return (
      <Link
        to={`/gallery/${gallery.id}`}
        className={`flex-shrink-0 ${cardWidth} rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group hover:scale-[1.02]`}
      >
        <div className={`relative ${cardHeight} bg-base-300 overflow-hidden`}>
          <img
            src={imageSrc}
            alt={gallery.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              console.error(`[Gallery Card] Failed to load image: ${imageSrc}`, e);
              (e.target as HTMLImageElement).src = '/landing-page/artworks/artwork1.avif';
            }}
          />
          {showAvatar && (
            <div className="absolute bottom-3 left-3">
              <div className="w-10 h-10 rounded-full bg-base-200 border-2 border-base-100 skeleton"></div>
            </div>
          )}
          {gallery.likes !== undefined && (
            <div className="absolute top-3 right-3 flex gap-2">
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1.5 text-white text-xs">
                <span>❤️</span>
                <span>{gallery.likes}</span>
              </div>
              {gallery.comments !== undefined && (
                <div className="bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1.5 text-white text-xs">
                  <span>💬</span>
                  <span>{gallery.comments}</span>
                </div>
              )}
            </div>
          )}
          {!showAvatar && (
            <div className="absolute top-3 right-3">
              <button className="btn btn-circle btn-sm bg-black/50 backdrop-blur-sm border-0 hover:bg-black/70 text-white">
                <Info className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
        <div className="bg-primary text-primary-content p-2.5">
          <h3 className="font-semibold text-sm truncate">{gallery.title}</h3>
          {gallery.artistName && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-base-200 skeleton flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{gallery.artistName}</p>
                <p className="text-[10px] opacity-80 truncate">{gallery.artistHandle} • {gallery.artistType}</p>
              </div>
            </div>
          )}
        </div>
      </Link>
    );
  };

  const GalleryGridCard = ({ gallery }: { gallery: GalleryCard }) => {
    const imageSrc = gallery.imageUrl || '/landing-page/artworks/artwork1.avif';

    return (
      <Link
        to={`/gallery/${gallery.id}`}
        className="card bg-base-100 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all group cursor-pointer"
      >
        <div className="relative h-64 bg-base-300 overflow-hidden">
          <img
            src={imageSrc}
            alt={gallery.title}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              console.error(`[Gallery Grid Card] Failed to load image: ${imageSrc}`, e);
              (e.target as HTMLImageElement).src = '/landing-page/artworks/artwork1.avif';
            }}
          />
        {gallery.likes !== undefined && (
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2 text-white text-sm">
              <span>❤️</span>
              <span>{gallery.likes}</span>
            </div>
            {gallery.comments !== undefined && (
              <div className="bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5 flex items-center gap-2 text-white text-sm">
                <span>💬</span>
                <span>{gallery.comments}</span>
              </div>
            )}
          </div>
        )}
        </div>
        <div className="bg-primary text-primary-content p-3">
          <h3 className="font-semibold text-sm truncate mb-1.5">{gallery.title}</h3>
          {gallery.artistName && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-base-200 skeleton flex-shrink-0"></div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{gallery.artistName}</p>
                <p className="text-[10px] opacity-80 truncate">{gallery.artistHandle} • {gallery.artistType}</p>
              </div>
            </div>
          )}
        </div>
      </Link>
    );
  };

  const HorizontalScrollSection = ({
    title,
    galleries,
    showAvatar = false,
    showDropdowns = false,
  }: {
    title: string;
    galleries: GalleryCard[];
    showAvatar?: boolean;
    showDropdowns?: boolean;
  }) => (
    <section className="mb-12">
      {/* Purple Banner */}
      <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-xl lg:text-2xl font-bold">{title}</h2>
          {showDropdowns && (
            <div className="flex flex-wrap gap-2">
              <select className="select select-bordered select-sm bg-base-100 text-base-content border-base-300 focus:outline-primary text-xs">
                <option>Sort by most popular</option>
                <option>Sort by newest</option>
                <option>Sort by oldest</option>
              </select>
              <select className="select select-bordered select-sm bg-base-100 text-base-content border-base-300 focus:outline-primary text-xs">
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
                <option>All Time</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative">
        <div
          className="flex gap-6 overflow-x-auto pb-4 px-4 lg:px-6 scroll-smooth"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
          }}
        >
          {galleries.map((gallery) => (
            <HorizontalScrollCard
              key={gallery.id}
              gallery={gallery}
              showAvatar={showAvatar}
            />
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <MainLayout showRightSidebar={false}>
      <div className="container mx-auto px-4 lg:px-8 py-8">
        {/* Navigation Button to My Galleries */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => navigate('/gallery/me')}
            className="btn btn-primary gap-2 hover:gap-3 transition-all duration-200"
          >
            <Images className="w-4 h-4" />
            <span>My Galleries</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Fellows You Follow Section */}
        <HorizontalScrollSection
          title="Fellows You Follow"
          galleries={fellowsGalleries}
          showAvatar={true}
        />

        {/* Best Galleries Recently Section */}
        <HorizontalScrollSection
          title="Best Galleries Recently"
          galleries={bestGalleries}
          showDropdowns={true}
        />

        {/* Browse Other Galleries Section */}
        <section className="mb-12">
          {/* Purple Banner */}
          <div className="bg-gradient-to-r from-primary to-primary/90 text-primary-content py-3 px-4 lg:px-6 mb-4 rounded-t-xl shadow-md">
            <h2 className="text-xl lg:text-2xl font-bold">Browse Other Galleries</h2>
          </div>

          {/* Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 lg:px-8">
            {otherGalleries.map((gallery) => (
              <GalleryGridCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
        </section>
      </div>

      <style>{`
        /* Webkit browsers (Chrome, Safari, newer Edge) */
        div::-webkit-scrollbar {
          height: 8px;
        }
        div::-webkit-scrollbar-track {
          background: transparent;
        }
        div::-webkit-scrollbar-thumb {
          background: rgba(155, 155, 155, 0.5);
          border-radius: 4px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: rgba(155, 155, 155, 0.7);
        }
      `}</style>
    </MainLayout>
  );
};

export default GalleryIndex;
