// components/index

export { default as ThemeProvider } from './theme-provider'
export { default as Index } from './index/index.component'

// Auth
export { default as ProtectedRoute } from './auth/protected-route'
export { default as CollectiveProtectedRoute } from './auth/collective-protected-route'
export { GuestRoute } from './auth/guest-route'

// Account
export { default as Login } from './account/login.component'
export { LogoutButton } from './account/logout'
export { default as Register } from './account/register.component'

// Home
export { default as Home } from './home/index.component'

// Profile
export { default as Profile } from './profile/profile-section.component'
export { default as Timeline } from './profile/timeline.component'
export { default as NavigateToOwnProfile } from './profile/navigate-to-own-profile.component'

// Collective
export { default as Collective } from './collective/index.component'
export { default as CollectiveCreate } from './collective/collective-create.component'
export { default as CollectiveHome } from './collective/inside-collective.component'
export { default as CollectiveMembers } from './collective/collective-members.component'
export { default as CollectiveAdmin } from './collective/collective-admin.component'

// Gallery
export { default as GalleryIndex } from './gallery/index.component'
export { default as MyGalleries } from './gallery/galleries.component'
export { default as GalleryEditor } from './gallery/editor.component'
export { default as PublishedGalleryView } from './gallery/published-gallery.view'

// Brush Drips
export { default as BrushDripsPage } from './brush-drips/index.component'
export { default as BrushDripsTransactions } from './brush-drips/transactions.component'

// Notifications
export { default as NotificationIndex } from './notifications/index.component'

// Post
export { default as PostDetail } from './post/post-detail.component'

// Fellows
export { default as PendingFriendRequestsPage } from './fellows/pending-requests-page.component'

// Error pages
export { default as NotFound } from './error/not-found.component'