// index/index

// import Artworks from "./artworks.component";
// import ReviewCarousel from "./reviews-section.component";
import Features from "./features.component";
import CallToAction from "./cta.component";
import Hero from "./hero.component";
import Header from "./header.component";
import Footer from "./footer.component";
import { lazy, Suspense } from "react";

const Artworks = lazy(() => import("./artworks.component"));
// const Hero = lazy(() => lazyWithRetry(() => import('./hero.component')))
// const Features = lazy(() => lazyWithRetry(() => import('./features.component')))
const ReviewCarousel = lazy(() => import("./reviews-section.component"));
// const CallToAction = lazy(() => lazyWithRetry(() => import('./cta.component')))
// // const Header = lazy(() => lazyWithRetry(() => import('./header.component')))
// const Footer = lazy(() => lazyWithRetry(() => import('./footer.component')))

export default function Index() {
  return (
    <div className="overflow-hidden">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <Hero />

      <Suspense fallback={<div className="p-5">Loading...</div>}>
        {/* Artworks Section */}
        <Artworks />
      </Suspense>

      <Suspense fallback={<div className="p-5">Loading...</div>}>
        {/* Features Section */}
        <Features />
      </Suspense>

      <Suspense fallback={<div className="p-5">Loading...</div>}>
        {/* Community Reviews Section */}
        <ReviewCarousel />
      </Suspense>

      {/* CTA Section */}
      <CallToAction />

      {/* Footer */}
      <Footer />
    </div>
  );
}
