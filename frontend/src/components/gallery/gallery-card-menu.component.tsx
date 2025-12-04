import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, User, MessageCircle, Flag } from 'lucide-react';

interface GalleryCardMenuProps {
  username: string;
}

export const GalleryCardMenu = ({ username }: GalleryCardMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Use setTimeout to avoid immediate trigger
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div 
      ref={dropdownRef}
      className="absolute top-3 right-3 z-30"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="dropdown dropdown-end">
        <button
          type="button"
          className="btn btn-circle btn-sm bg-black/50 backdrop-blur-sm border-0 hover:bg-black/70 text-white"
          onClick={handleToggle}
        >
          <MoreVertical className="w-4 h-4" />
        </button>
        {isOpen && (
          <ul className="dropdown-content menu p-2 shadow-xl bg-base-100 rounded-box w-42 border border-base-300 mt-2 z-50">
            <li>
              <Link
                to={`/profile/@${username}`}
                className="gap-3 text-xs"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-4 h-4 text-primary" />
                <span>View artist profile</span>
              </Link>
            </li>
            <li>
              <div title="Coming Soon">
                <Link
                  to="#"
                  className="gap-3 opacity-50 cursor-not-allowed text-xs flex"
                  onClick={(e) => e.preventDefault()}
                >
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <span>Converse with artist</span>
                </Link>
              </div>
            </li>
            <li>
              <div title="Coming Soon">
                <Link
                  to="#"
                  className="gap-3 opacity-50 cursor-not-allowed text-xs flex"
                  onClick={(e) => e.preventDefault()}
                >
                  <Flag className="w-4 h-4 text-primary" />
                  <span>Report gallery</span>
                </Link>
              </div>
            </li>
          </ul>
        )}
      </div>
    </div>
  );
};

