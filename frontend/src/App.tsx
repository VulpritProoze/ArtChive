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
  Home,
  GalleryIndex,
  Profile,
  Timeline,
} from "@components";
import { PostProvider } from "@context/post-context";
import { CollectivePostProvider } from "@context/collective-post-context";
import { AuthProvider } from "@context/auth-context";
import { LoadingProvider } from "@context/loading-context";
import { CollectiveProvider } from "@context/collective-context";
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
      <ThemeProvider>
        <LoadingProvider>
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
                  <Route path="/profile/me" element={<Profile />} />

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
                    </Route>
                  </Route>

                  <Route path="/gallery" element={<GalleryIndex />} />
                </Route>
              </Routes>
            </Suspense>
            <ThemedToastContainer />
          </Router>
        </LoadingProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
