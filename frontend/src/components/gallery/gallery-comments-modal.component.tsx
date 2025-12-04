import GallerySidebarSection from './gallery-sidebar-section.component';

interface GalleryCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  galleryId: string;
  highlightedItemId?: string | null;
}

export default function GalleryCommentsModal({
  isOpen,
  onClose,
  galleryId,
  highlightedItemId,
}: GalleryCommentsModalProps) {

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-base-100 shadow-2xl z-50 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 bg-base-200/50 sticky top-0 z-10">
          <h2 className="text-xl font-bold">Sidebar</h2>
          <button
            onClick={onClose}
            className="btn btn-circle btn-ghost btn-sm"
            aria-label="Close sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>


        {/* Comments List - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <GallerySidebarSection
            galleryId={galleryId}
            highlightedItemId={highlightedItemId}
            enableInitialFetch={true}
          />
        </div>
      </div>

      {/* Add slide-in animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </>
  );
}

