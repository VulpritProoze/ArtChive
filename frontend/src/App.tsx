// App.tsx
import { lazy, Suspense, useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Outlet } from "react-router-dom";
import { RouteLoadingFallback } from "./components/route-loading-fallback";
import {
  ThemeProvider,
  ProtectedRoute,
  CollectiveProtectedRoute,
  GuestRoute,
  Collective,
  CollectiveCreate,
  CollectiveHome,
  CollectiveMembers,
  CollectiveAdmin,
  Home,
  GalleryIndex,
  GalleryEditor,
  PublishedGalleryView,
  Profile,
  Timeline,
  BrushDripsPage,
  BrushDripsTransactions,
  NotificationIndex,
  PostDetail,
  NotFound,
  MyGalleries,
} from "@components";
import { PostProvider } from "@context/post-context";
import { CollectivePostProvider } from "@context/collective-post-context";
import { AuthProvider } from "@context/auth-context";
import { CollectiveProvider } from "@context/collective-context";
import { NotificationProvider } from "@context/notification-context";
import useToggleTheme from "@hooks/use-theme";
import { ToastContainer } from "react-toastify";

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

  return (
    <ToastContainer
      position="top-right"
      autoClose={20000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      pauseOnHover
      theme={toastTheme}
    />
  );
}

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
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
                    <Route path="/drips" element={<BrushDripsPage />} />
                    <Route path="/drips/transactions" element={<BrushDripsTransactions />} />
                    <Route path="/notifications" element={<NotificationIndex />} />

                    <Route
                      path="/home"
                      element={
                        <PostProvider>
                          <Home />
                        </PostProvider>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <PostProvider>
                          <Timeline />
                        </PostProvider>
                      }
                    />

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

                      {/* Nested protected route for specific collectives */}
                      <Route element={<CollectiveProtectedRoute />}>
                        <Route
                          path=":collectiveId"
                          element={
                            <PostProvider>
                              <CollectivePostProvider>
                                <CollectiveHome />
                              </CollectivePostProvider>
                            </PostProvider>
                          }
                        />
                        <Route path=":collectiveId/members" element={<CollectiveMembers />} />
                        <Route path=":collectiveId/admin" element={<CollectiveAdmin />} />
                      </Route>
                    </Route>

                    <Route path="/gallery" element={<GalleryIndex />} />
                    <Route path="/gallery/me" element={<MyGalleries />} />
                    <Route path="/gallery/:userId" element={<PublishedGalleryView />} />
                    <Route path="/gallery/:galleryId/editor" element={<GalleryEditor />} />

                    {/* Individual Post Route */}
                    <Route path="/post/:postId" element={<PostDetail />} />
                  </Route>

                  {/* 404 Not Found - Must be last */}
                  <Route path="/404" element={<NotFound />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
              <ThemedToastContainer />
            </Router>
        </ThemeProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
