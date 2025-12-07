// App.tsx
import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { RouteLoadingFallback } from "./components/route-loading-fallback";
import {
  ThemeProvider,
  ProtectedRoute,
  CollectiveAdminRoute,
  GuestRoute,
  Collective,
  CollectiveCreate,
  CollectiveViewWrapper,
  CollectiveMembers,
  Home,
  PublishedGalleryView,
  Profile,
  Timeline,
  BrushDripsPage,
  BrushDripsTransactions,
  NotificationIndex,
  PostDetail,
  NotFound,
  NavigateToOwnProfile,
  PendingFriendRequestsPage,
  SearchPage,
  Account,
} from "@components";

// Lazy load heavy components
const CollectiveAdmin = lazy(() => import("@components/collective/collective-admin.component"));
const GalleryIndex = lazy(() => import("@components/gallery/index.component"));
const GalleryEditor = lazy(() => import("@components/gallery/editor.component"));
const MyGalleries = lazy(() => import("@components/gallery/galleries.component"));
const AvatarListPage = lazy(() => import("@components/avatar/avatar-list.component"));
const AvatarEditorPage = lazy(() => import("@components/avatar/avatar-editor.component"));
const ReputationPage = lazy(() => import("@components/reputation/reputation.component"));

import { PostUIProvider } from "@context/post-ui-context";
import { CollectivePostProvider } from "@context/collective-post-context";
import { AuthProvider } from "@context/auth-context";
import { CollectiveProvider } from "@context/collective-context";
import { RealtimeProvider } from "@context/realtime-context";
// Legacy providers (deprecated - kept for backward compatibility during migration)
import { NotificationProvider } from "@context/notification-context";
import { FriendRequestProvider } from "@context/friend-request-context";
import { QueryProvider } from "@providers/query-provider";
import useToggleTheme from "@hooks/use-theme";
import { ToastContainer } from "@components/common/toast";

const Index = lazy(() =>
  import("@components/index/index.component").then((module) => {
    console.log("Index chunk loaded");
    return module;
  })
);
const Login = lazy(() => import("@components/account/login.component"));
const Register = lazy(() => import("@components/account/register.component"));

function ThemedToastContainer() {
  const { isDarkMode } = useToggleTheme();
  const [toastTheme, setToastTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setToastTheme(isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return <ToastContainer theme={toastTheme} />;
}

// Feature flag for unified WebSocket (set VITE_USE_UNIFIED_WS=false to use legacy)
const USE_UNIFIED_WEBSOCKET = import.meta.env.VITE_USE_UNIFIED_WS !== 'false'; // Default to true

// Shared routes component to avoid duplication
function AppRoutes() {
  return (
    <ThemeProvider>
      <Router>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Guest routes (if auth user navigates here, user will be redirected back to /home) */}
            <Route element={<GuestRoute />}>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
            </Route>

            {/* Protected routes (with auth check) */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile/me" element={<Profile />} />
              <Route path="/account" element={<Account />} />
              <Route path="/drips" element={<BrushDripsPage />} />
              <Route path="/drips/transactions" element={<BrushDripsTransactions />} />
              <Route path="/reputation" element={<ReputationPage />} />
              <Route path="/notifications" element={<NotificationIndex />} />
              <Route path="/fellows/requests" element={<PendingFriendRequestsPage />} />
              <Route path="/search" element={<SearchPage />} />

              <Route path="/profile/:username" element={<Timeline />} />
              <Route path="/profile" element={<NavigateToOwnProfile />} />

              <Route path="/home" element={<Home />} />

              {/* Collective Routes Layout */}
              <Route
                path="/collective"
                element={
                  <CollectiveProvider>
                    <Outlet />
                  </CollectiveProvider>
                }
              >
                {/* Index route: /collective */}
                <Route index element={<Collective />} />
                <Route path="create" element={<CollectiveCreate />} />

                {/* Collective routes */}
                <Route
                  path=":collectiveId"
                  element={
                    <CollectivePostProvider>
                      <CollectiveViewWrapper />
                    </CollectivePostProvider>
                  }
                />
                <Route path=":collectiveId/members" element={<CollectiveMembers />} />
                
                {/* Protected admin route */}
                <Route element={<CollectiveAdminRoute />}>
                  <Route path=":collectiveId/admin" element={<CollectiveAdmin />} />
                </Route>
              </Route>

              <Route path="/gallery" element={<GalleryIndex />} />
              <Route path="/gallery/me" element={<MyGalleries />} />
              <Route path="/gallery/:userId" element={<PublishedGalleryView />} />
              <Route path="/gallery/:galleryId/editor" element={<GalleryEditor />} />

              {/* Avatar Routes */}
              <Route path="/avatar" element={<AvatarListPage />} />
              <Route path="/avatar/create" element={<AvatarEditorPage />} />
              <Route path="/avatar/:avatarId/edit" element={<AvatarEditorPage />} />

              {/* Individual Post Route */}
              <Route path="/post/:postId" element={<PostDetail />} />

              {/* 404 Not Found - Must be last */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
        <ThemedToastContainer />
      </Router>
    </ThemeProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryProvider>
        {USE_UNIFIED_WEBSOCKET ? (
          // Unified WebSocket context (recommended)
          <RealtimeProvider>
            <PostUIProvider>
              <AppRoutes />
            </PostUIProvider>
          </RealtimeProvider>
        ) : (
          // Legacy separate contexts (deprecated)
          <NotificationProvider>
            <FriendRequestProvider>
              <PostUIProvider>
                <AppRoutes />
              </PostUIProvider>
            </FriendRequestProvider>
          </NotificationProvider>
        )}
      </QueryProvider>
    </AuthProvider>
  );
}

export default App;
