// index/index

// import Artworks from "./artworks.component";
// import Features from "./features.component";
// import ReviewCarousel from "./reviews-section.component";
import CallToAction from "./cta.component";
import Hero from "./hero.component";
import Header from "./header.component";
import Features from "./features.component";
import Footer from "./footer.component";
import { lazy, Suspense } from 'react'
import { ErrorBoundary } from "../error-boundary";
import lazyWithRetry from "@utils/lazy-with-retry";

const Artworks = lazy(() => lazyWithRetry(() => import('./artworks.component')))
// const Hero = lazy(() => lazyWithRetry(() => import('./hero.component')))
// const Features = lazy(() => lazyWithRetry(() => import('./features.component')))
const ReviewCarousel = lazy(() => lazyWithRetry(() => import('./reviews-section.component')))
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

      <ErrorBoundary>
        <Suspense fallback={<div className='p-5'>Loading...</div>}>
          {/* Artworks Section */}
          <Artworks />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<div className='p-5'>Loading...</div>}>
          {/* Features Section */}
          <Features />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={<div className='p-5'>Loading...</div>}>
          {/* Community Reviews Section */}
          <ReviewCarousel />
        </Suspense>
      </ErrorBoundary>

      {/* CTA Section */}
      <CallToAction />

      {/* Footer */}
      <Footer />
    </div>
  );
}
