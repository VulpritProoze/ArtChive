// App.tsx
import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { RouteLoadingFallback } from "./components/route-loading-fallback";
import { ThemeProvider, ProtectedRoute } from "@components";
import { AuthProvider } from "@context/auth-context";
import { LoadingProvider } from "@context/loading-context";

const Index = lazy(() => import("@components/index/index.component").then(module => {
  console.log('Index chunk loaded')
  return module
}));
const Login = lazy(() => import("@components/account/login.component"));
const Home = lazy(() => import("@components/home/index.component"));
const Register = lazy(() => import("@components/account/register.component"));
const GalleryIndex = lazy(() => import("@components/gallery/index.component"));

function App() {
  useEffect(() => {
    document.title = "ArtChive";
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <LoadingProvider>
          <Router>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                {/* Public routes (no auth check) */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected routes (with auth check) */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/home" element={<Home />} />
                  <Route path="/gallery" element={<GalleryIndex />} />
                </Route>
              </Routes>
            </Suspense>
          </Router>
        </LoadingProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;