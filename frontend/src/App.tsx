// app

import { useEffect, lazy, Suspense } from "react";
import lazyWithRetry from "@utils/lazy-with-retry";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@components/error-boundary";
import { RouteLoadingFallback } from "./components/route-loading-fallback";
import {
  ThemeProvider,
  ProtectedRoute,
  // Index,
  // Login,
  // Home,
  // Register,
  // GalleryIndex,
} from "@components";
import { AuthProvider } from "@context/auth-context";
import { LoadingProvider } from "@context/loading-context";

const Index = lazy(() =>
  lazyWithRetry(() => import("@components/index/index.component"))
);
const Login = lazy(() =>
  lazyWithRetry(() => import("@components/account/login.component"))
);
const Home = lazy(() =>
  lazyWithRetry(() => import("@components/home/index.component"))
);
const Register = lazy(() =>
  lazyWithRetry(() => import("@components/account/register.component"))
);
const GalleryIndex = lazy(() =>
  lazyWithRetry(() => import("@components/gallery/index.component"))
);

function App() {
  useEffect(() => {
    document.title = "ArtChive";
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        {/* Global loader */}
        <LoadingProvider> 
          <Router>
            <ErrorBoundary>
              <Suspense fallback={<RouteLoadingFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  {/* Protected routes */}
                  <Route element={<ProtectedRoute />}>
                    <Route path="/home" element={<Home />} />
                    <Route path="/gallery" element={<GalleryIndex />} />
                  </Route>
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Router>
        </LoadingProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
