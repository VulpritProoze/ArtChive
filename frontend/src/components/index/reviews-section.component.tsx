// index/reviews-section

import { motion } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuoteLeft } from '@fortawesome/free-solid-svg-icons';
import { useState, useEffect } from 'react';

interface Review {
  id: number;
  name: string;
  artistType: string;
  avatar: string;
  review: string;
  rating: number;
}

const reviews: Review[] = [
  {
    id: 1,
    name: 'Sarah Chen',
    artistType: 'Traditional Painter',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    review: 'ArtChive helped me connect with galleries I never thought would notice my work. My first exhibition was booked within 3 months of joining!',
    rating: 5,
  },
  {
    id: 2,
    name: 'Jamal Williams',
    artistType: 'Digital Artist',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    review: 'The feedback I get from other digital artists has improved my skills tremendously. The community is so supportive and knowledgeable.',
    rating: 5,
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    artistType: 'Dance Professional',
    avatar: 'https://randomuser.me/api/portraits/women/63.jpg',
    review: 'As a dancer, I love how ArtChive lets me showcase my performances visually. Ive booked several gigs through connections made here.',
    rating: 4,
  },
  {
    id: 4,
    name: 'Thomas Kim',
    artistType: 'Writer',
    avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
    review: 'The writing community on ArtChive is vibrant. Ive found beta readers and even a publisher for my poetry collection through this platform.',
    rating: 5,
  },
  {
    id: 5,
    name: 'Olivia Martin',
    artistType: 'Sculptor',
    avatar: 'https://randomuser.me/api/portraits/women/28.jpg',
    review: 'Displaying my sculptures in 3D on ArtChive has brought me international clients. The portfolio tools are perfect for my medium.',
    rating: 5,
  },
  {
    id: 6,
    name: 'Diego Sanchez',
    artistType: 'Tattoo Artist',
    avatar: 'https://randomuser.me/api/portraits/men/91.jpg',
    review: 'My appointment bookings doubled after joining ArtChive. Clients love being able to browse my portfolio and book directly through my profile.',
    rating: 4,
  },
  {
    id: 7,
    name: 'Aisha Johnson',
    artistType: 'Musician',
    avatar: 'https://randomuser.me/api/portraits/women/85.jpg',
    review: 'Sharing my compositions and connecting with visual artists for collaborations has been game-changing. The audio integration works beautifully.',
    rating: 5,
  },
  {
    id: 8,
    name: 'Liam Park',
    artistType: 'Floral Artist',
    avatar: 'https://randomuser.me/api/portraits/men/67.jpg',
    review: 'ArtChive understands that floral art is more than just flowers - its temporary installations need proper documentation. Perfect platform for us.',
    rating: 4,
  },
];

const ReviewCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-advance carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % reviews.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    setIsAutoPlaying(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % reviews.length);
    setIsAutoPlaying(false);
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    setIsAutoPlaying(false);
  };

  // Calculate visible cards
  const getVisibleCards = () => {
    const cards: Review[] = [];
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + reviews.length) % reviews.length;
      cards.push(reviews[index]);
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
          Community Reviews
        </motion.h2>
        <motion.p
          className="mb-12 text-lg opacity-70 text-center max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.7 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          Hear what artists from all disciplines are saying about their ArtChive experience.
        </motion.p>

        <div className="relative h-[350px]">
          <div className="absolute inset-0 flex items-center justify-center">
            {visibleCards.map((card, i) => {
              const position = i - 1; // -1 (left), 0 (center), 1 (right)
              const isCenter = position === 0;

              return (
                <motion.div
                  key={card.id}
                  className={`absolute w-full max-w-md ${isCenter ? 'z-10' : 'z-0'}`}
                  initial={{ 
                    x: position * 300,
                    scale: isCenter ? 1 : 0.85,
                    opacity: isCenter ? 1 : 0.7,
                    filter: isCenter ? 'none' : 'blur(1px)'
                  }}
                  animate={{ 
                    x: position * 300,
                    scale: isCenter ? 1 : 0.85,
                    opacity: isCenter ? 1 : 0.7,
                    filter: isCenter ? 'none' : 'blur(1px)'
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={{
                    transformOrigin: 'center',
                  }}
                  whileHover={isCenter ? {} : { scale: 0.9 }}
                >
                  <div className={`card bg-base-200 shadow-xl p-6 ${!isCenter && 'h-[90%]'}`}>
                    <div className="flex items-center mb-4">
                      <div className="avatar">
                        <div className="w-16 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                          <img src={card.avatar.trim()} alt={card.name} loading='lazy'/>
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="font-bold text-lg">{card.name}</h3>
                        <p className="text-sm opacity-70">{card.artistType}</p>
                        <div className="rating rating-sm">
                          {[...Array(5)].map((_, i) => (
                            <input
                              key={i}
                              type="radio"
                              name={`rating-${card.id}`}
                              className="mask mask-star"
                              checked={i < card.rating}
                              readOnly
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <FontAwesomeIcon
                        icon={faQuoteLeft}
                        className="text-primary opacity-20 text-4xl absolute -top-2 -left-2"
                      />
                      <p className="italic relative z-10">{card.review}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Navigation controls */}
        <div className="flex flex-col items-center">
          <div className="flex space-x-4 mb-4">
            <button
              onClick={handlePrev}
              className="btn btn-circle btn-outline"
              aria-label="Previous review"
            >
              ❮
            </button>
            <button
              onClick={handleNext}
              className="btn btn-circle btn-outline"
              aria-label="Next review"
            >
              ❯
            </button>
          </div>
          <div className="flex space-x-2">
            {reviews.map((_, index) => (
              <button
                key={index}
                onClick={() => goToIndex(index)}
                className={`w-3 h-3 rounded-full ${currentIndex === index ? 'bg-primary' : 'bg-base-300'}`}
                aria-label={`Go to review ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewCarousel;