import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCommentDots,
  faBell,
  faTrophy,
  faQuestionCircle,
  faCog,
} from "@fortawesome/free-solid-svg-icons";
import type { User } from '@types';
import { formatArtistTypesToString } from '@utils';

export default function CommonHeader({ user }: { user: User }) {
    return <>
        {/* Header/Navbar */}
      <div className="flex items-center justify-between bg-base-100 px-6 py-3 shadow w-full">
        {/* Logo */}
        <Link to='/home' className='flex flex-row items-center'>
            <img 
                src='/logo/ArtChive_logo.png' 
                width='50'
            />
            <h2 className="text-xl font-bold text-primary">ArtChive</h2>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 mx-6 hidden md:block">
          <input
            type="text"
            placeholder="Search artists, artworks, collectives..."
            className="w-full max-w-lg px-4 py-2 border border-base-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary bg-base-100 text-base-content placeholder-base-content/70"
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-8">

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <Link to="/profile">
              <img
                src={user?.profile_picture}
                alt="Chenoborg"
                className="w-10 h-10 rounded-full border border-base-300"
              />
            </Link>

            <div className="hidden md:block">
              <Link to="/profile">
                <h5 className="text-sm font-semibold text-base-content">
                  {user?.fullname}
                </h5>
              </Link>
              <p className="text-xs text-primary">@{user?.username}</p>
              <p className="text-xs text-base-content/70">
                {formatArtistTypesToString(user?.artist_types)}
              </p>
            </div>
          </div>

          {/* Menus / Icons */}
          <div className="hidden sm:flex items-center gap-5 text-base-content text-lg">
            <a href="#">
              <FontAwesomeIcon
                icon={faCommentDots}
                className="hover:text-primary transition-colors"
              />
            </a>
            <a href="#">
              <FontAwesomeIcon
                icon={faBell}
                className="hover:text-primary transition-colors"
              />
            </a>
            <a href="#">
              <FontAwesomeIcon
                icon={faTrophy}
                className="hover:text-primary transition-colors"
              />
            </a>
            <a href="#">
              <FontAwesomeIcon
                icon={faQuestionCircle}
                className="hover:text-primary transition-colors"
              />
            </a>
            <a href="#">
              <FontAwesomeIcon
                icon={faCog}
                className="hover:text-primary transition-colors"
              />
            </a>
          </div>
        </div>
      </div>
    </>
}