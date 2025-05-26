// index/index

import Hero from './hero.component';
import Artworks from './artworks.component';
import Features from './features.component';
import ReviewCarousel from './reviews-section.component';
import CallToAction from './cta.component';

export default function Index() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <Hero />

      {/* Artworks Section */}
      <Artworks />

      {/* Features Section */}
      <Features />

      {/* Community Reviews Section */}
      <ReviewCarousel />

      {/* CTA Section */}
      <CallToAction />
    </div>
  );
}