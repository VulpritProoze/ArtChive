import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHeart, faEye, faBookmark } from "@fortawesome/free-solid-svg-icons";
import type { ArtistType } from "./artist-type.type";
import { artworks } from "./artworks";

export default function PopularArtworks() {
  const [currentArtistType, setCurrentArtistType] =
    useState<ArtistType>("visual arts");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Filter artworks by current artist type
  const filteredArtworks = artworks.filter(
    (artwork) => artwork.artistType === currentArtistType
  );

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredArtworks.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying, filteredArtworks.length]);

  const handlePrev = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + filteredArtworks.length) % filteredArtworks.length
    );
    setIsAutoPlaying(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % filteredArtworks.length);
    setIsAutoPlaying(false);
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  // Calculate visible cards
  const getVisibleCards = () => {
    const cards = [];
    for (let i = -1; i <= 1; i++) {
      const index =
        (currentIndex + i + filteredArtworks.length) % filteredArtworks.length;
      cards.push(filteredArtworks[index]);
    }
    return cards;
  };

  const visibleCards = getVisibleCards();

  return (
    <section className="py-20 bg-base-100">
      <div className="container mx-auto px-6">
        <motion.h2
          className="text-3xl font-bold mb-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Popular Artworks
        </motion.h2>

        <motion.p
          className="mb-12 text-lg opacity-70 text-center max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Discover trending artworks across all artistic disciplines
        </motion.p>

        {/* Artist Type Selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {[
            "visual arts",
            "digital & new media arts",
            "literary arts",
            "performance arts",
            "music art",
            "culinary art",
            "functional art",
            "environmental art",
            "film art",
            "cross-disciplinary art",
          ].map((type) => (
            <button
              key={type}
              onClick={() => {
                setCurrentArtistType(type as ArtistType);
                setCurrentIndex(0);
                setIsAutoPlaying(true);
              }}
              className={`btn btn-sm ${
                currentArtistType === type ? "btn-primary" : "btn-ghost"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Artwork Carousel */}
        <div className="relative h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentArtistType}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {visibleCards.map((artwork, i) => {
                const position = i - 1; // -1 (left), 0 (center), 1 (right)
                const isCenter = position === 0;

                return (
                  <motion.div
                    key={artwork.id}
                    className={`absolute w-full max-w-md ${
                      isCenter ? "z-10" : "z-0"
                    }`}
                    initial={{
                      x: position * 300,
                      scale: isCenter ? 1 : 0.85,
                      opacity: isCenter ? 1 : 0.7,
                      filter: isCenter ? "none" : "blur(1px)",
                    }}
                    animate={{
                      x: position * 300,
                      scale: isCenter ? 1 : 0.85,
                      opacity: isCenter ? 1 : 0.7,
                      filter: isCenter ? "none" : "blur(1px)",
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    style={{
                      transformOrigin: "center",
                    }}
                    whileHover={isCenter ? { scale: 1.02 } : {}}
                  >
                    <div
                      className={`card bg-base-200 shadow-xl ${
                        !isCenter && "h-[90%]"
                      }`}
                    >
                      <figure className="relative">
                        <img
                          src={artwork.imageUrl}
                          alt={artwork.title}
                          className="w-full h-64 object-cover"
                        />
                        {isCenter && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                            <h3 className="text-xl font-bold text-white">
                              {artwork.title}
                            </h3>
                            <p className="text-white opacity-80">
                              {artwork.artist}
                            </p>
                          </div>
                        )}
                      </figure>
                      {isCenter && (
                        <div className="card-body">
                          <div className="flex justify-between items-center mb-2">
                            <span className="badge badge-primary">
                              {artwork.artistType}
                            </span>
                            <span className="text-sm opacity-70">
                              {artwork.year}
                            </span>
                          </div>
                          <p>{artwork.description}</p>
                          <div className="card-actions justify-between mt-4">
                            <div className="flex items-center gap-2">
                              <button className="btn btn-ghost btn-sm">
                                <FontAwesomeIcon icon={faHeart} />
                                <span>{artwork.likes}</span>
                              </button>
                              <button className="btn btn-ghost btn-sm">
                                <FontAwesomeIcon icon={faEye} />
                              </button>
                            </div>
                            <button className="btn btn-ghost btn-sm">
                              <FontAwesomeIcon icon={faBookmark} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation controls */}
        <div className="flex flex-col items-center mt-8">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={handlePrev}
              className="btn btn-circle btn-outline"
              aria-label="Previous artwork"
            >
              ❮
            </button>
            <button
              onClick={handleNext}
              className="btn btn-circle btn-outline"
              aria-label="Next artwork"
            >
              ❯
            </button>
          </div>
          <div className="flex space-x-2">
            {filteredArtworks.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={`w-3 h-3 rounded-full ${
                  currentIndex === index ? "bg-primary" : "bg-base-300"
                }`}
                aria-label={`Go to artwork ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
