import type { ArtistType } from "@types";

export interface Artwork {
  id: number;
  title: string;
  artist: string;
  artistType: ArtistType;
  imageUrl: string;
  likes: number;
  description: string;
  year: number;
}

export const artworks: Artwork[] = [
  // Visual Arts
  {
    id: 1,
    title: "Whispers of the Forest",
    artist: "Elena Vasquez",
    artistType: "visual arts",
    imageUrl: "/landing-page/artworks/artwork1.avif",
    likes: 1245,
    description: "Oil on canvas depicting a mystical forest scene",
    year: 2022
  },
  {
    id: 2,
    title: "Urban Fragments",
    artist: "James Peterson",
    artistType: "visual arts",
    imageUrl: "/landing-page/artworks/artwork2.avif",
    likes: 892,
    description: "Mixed media collage of city life",
    year: 2021
  },
  {
    id: 3,
    title: "The Silent Observer",
    artist: "Mira Chen",
    artistType: "visual arts",
    imageUrl: "/landing-page/artworks/artwork3.avif",
    likes: 1567,
    description: "Large-scale portrait with acrylics",
    year: 2023
  },
  {
    id: 4,
    title: "Ephemeral Moments",
    artist: "David Kim",
    artistType: "visual arts",
    imageUrl: "/landing-page/artworks/artwork4.avif",
    likes: 723,
    description: "Watercolor series capturing fleeting moments",
    year: 2020
  },
  {
    id: 5,
    title: "Metamorphosis",
    artist: "Sophia Williams",
    artistType: "visual arts",
    imageUrl: "/landing-page/artworks/artwork5.jpg",
    likes: 2045,
    description: "Abstract expressionist work in oils",
    year: 2023
  },
  {
    id: 6,
    title: "Chromatic Dreams",
    artist: "Lucas Rodriguez",
    artistType: "visual arts",
    imageUrl: "/landing-page/artworks/artwork6.jpg",
    likes: 981,
    description: "Vibrant geometric abstraction",
    year: 2021
  },

  // Digital & New Media Arts
  {
    id: 7,
    title: "Neural Landscapes",
    artist: "Aisha Johnson",
    artistType: "digital & new media arts",
    imageUrl: "/landing-page/artworks/artwork7.avif",
    likes: 2310,
    description: "AI-generated interactive installation",
    year: 2023
  },
  {
    id: 8,
    title: "Synthetic Skies",
    artist: "Noah Tanaka",
    artistType: "digital & new media arts",
    imageUrl: "/landing-page/artworks/artwork8.jpg",
    likes: 1420,
    description: "Generative digital landscapes using machine learning",
    year: 2022
  },
  {
    id: 9,
    title: "Digital Pulse",
    artist: "Maya Patel",
    artistType: "digital & new media arts",
    imageUrl: "/landing-page/artworks/artwork9.jpg",
    likes: 1100,
    description: "Interactive light projection exploring human emotion",
    year: 2021
  },
  {
    id: 10,
    title: "Code Canvas",
    artist: "Leo Bennett",
    artistType: "digital & new media arts",
    imageUrl: "/landing-page/artworks/artwork10.jpg",
    likes: 987,
    description: "Visual coding artworks rendered in real-time",
    year: 2023
  },
  {
    id: 11,
    title: "Data Dreamscape",
    artist: "Zara Lin",
    artistType: "digital & new media arts",
    imageUrl: "/landing-page/artworks/artwork11.jpg",
    likes: 1345,
    description: "Visualization of data patterns in immersive environments",
    year: 2020
  },
  {
    id: 12,
    title: "Virtual Reverie",
    artist: "Ethan Cole",
    artistType: "digital & new media arts",
    imageUrl: "/landing-page/artworks/artwork12.jpg",
    likes: 1789,
    description: "VR-based art experience blending reality and imagination",
    year: 2022
  },

  // Literary Arts
  {
    id: 13,
    title: "The Weight of Silence",
    artist: "Thomas Wright",
    artistType: "literary arts",
    imageUrl: "/landing-page/artworks/aw13.avif",
    likes: 876,
    description: "Handwritten poetry collection",
    year: 2022
  },
  {
    id: 14,
    title: "Echoes of Time",
    artist: "Clara Moore",
    artistType: "literary arts",
    imageUrl: "/landing-page/artworks/aw14.jpg",
    likes: 765,
    description: "Short story anthology exploring memory and identity",
    year: 2021
  },
  {
    id: 15,
    title: "Ink & Emotion",
    artist: "Rajiv Desai",
    artistType: "literary arts",
    imageUrl: "/landing-page/artworks/aw15.jpg",
    likes: 654,
    description: "Collection of modern literary essays",
    year: 2020
  },
  {
    id: 16,
    title: "Between the Lines",
    artist: "Lena Torres",
    artistType: "literary arts",
    imageUrl: "/landing-page/artworks/aw16.jpg",
    likes: 901,
    description: "Experimental narrative prose exploring love and loss",
    year: 2023
  },
  {
    id: 17,
    title: "Fragments of Thought",
    artist: "Omar Khalid",
    artistType: "literary arts",
    imageUrl: "/landing-page/artworks/aw17.jpg",
    likes: 823,
    description: "Philosophical musings in poetic form",
    year: 2021
  },
  {
    id: 18,
    title: "Voices of the Past",
    artist: "Anika Roy",
    artistType: "literary arts",
    imageUrl: "/landing-page/artworks/aw18.jpg",
    likes: 710,
    description: "Historical fiction inspired by ancient myths",
    year: 2022
  },

  // Performance Arts
  {
    id: 19,
    title: "Dance of Shadows",
    artist: "Isabella Moreno",
    artistType: "performance arts",
    imageUrl: "/landing-page/artworks/aw19.jpg",
    likes: 1100,
    description: "Contemporary dance performance exploring duality",
    year: 2023
  },
  {
    id: 20,
    title: "The Mask Within",
    artist: "Daniel Alvarez",
    artistType: "performance arts",
    imageUrl: "/landing-page/artworks/aw20.jpg",
    likes: 980,
    description: "Experimental theater piece on identity and truth",
    year: 2021
  },
  {
    id: 21,
    title: "Breath of Motion",
    artist: "Nina Park",
    artistType: "performance arts",
    imageUrl: "/landing-page/artworks/aw21.jpg",
    likes: 1234,
    description: "Physical theatre exploring emotional landscapes",
    year: 2022
  },
  {
    id: 22,
    title: "Rhythm of Life",
    artist: "Carlos Mendez",
    artistType: "performance arts",
    imageUrl: "/landing-page/artworks/aw22.jpg",
    likes: 890,
    description: "Multimedia dance performance with live music",
    year: 2020
  },
  {
    id: 23,
    title: "Echo Chamber",
    artist: "Emily Clarke",
    artistType: "performance arts",
    imageUrl: "/landing-page/artworks/aw23.jpg",
    likes: 1010,
    description: "Immersive sound and movement installation",
    year: 2023
  },
  {
    id: 24,
    title: "Stage of Reflections",
    artist: "Jonas Hart",
    artistType: "performance arts",
    imageUrl: "/landing-page/artworks/aw24.jpg",
    likes: 925,
    description: "One-person show examining personal transformation",
    year: 2021
  },

  // Music Art
  {
    id: 25,
    title: "Symphony of Light",
    artist: "Amir Khan",
    artistType: "music art",
    imageUrl: "/landing-page/artworks/aw25.jpg",
    likes: 1300,
    description: "Orchestral composition paired with visual projections",
    year: 2023
  },
  {
    id: 26,
    title: "Soundscapes of the Mind",
    artist: "Sophie Laurent",
    artistType: "music art",
    imageUrl: "/landing-page/artworks/aw26.jpg",
    likes: 1120,
    description: "Electronic album exploring consciousness through sound",
    year: 2022
  },
  {
    id: 27,
    title: "Strings of Memory",
    artist: "Marcus Lee",
    artistType: "music art",
    imageUrl: "/landing-page/artworks/aw27.jpg",
    likes: 990,
    description: "Solo violin suite reflecting on personal history",
    year: 2021
  },
  {
    id: 28,
    title: "Beats of the Earth",
    artist: "Tina Okoro",
    artistType: "music art",
    imageUrl: "/landing-page/artworks/aw28.jpg",
    likes: 1450,
    description: "World fusion album combining traditional rhythms",
    year: 2020
  },
  {
    id: 29,
    title: "Harmonic Resonance",
    artist: "Ivan Petrov",
    artistType: "music art",
    imageUrl: "/landing-page/artworks/aw29.jpg",
    likes: 1080,
    description: "Experimental jazz and electronic fusion",
    year: 2023
  },
  {
    id: 30,
    title: "Nightfall Melodies",
    artist: "Emma Brooks",
    artistType: "music art",
    imageUrl: "/landing-page/artworks/aw30.jpg",
    likes: 1200,
    description: "Piano-driven ambient album for meditation and reflection",
    year: 2022
  },

  // Culinary Art
  {
    id: 31,
    title: "Plated Poetry",
    artist: "Chef Maria Delgado",
    artistType: "culinary art",
    imageUrl: "/landing-page/artworks/aw13.avif",
    likes: 1500,
    description: "Edible art dish blending flavor and visual aesthetics",
    year: 2023
  },
  {
    id: 32,
    title: "Flavors of the Sea",
    artist: "Chef Hiroshi Sato",
    artistType: "culinary art",
    imageUrl: "/landing-page/artworks/aw14.jpg",
    likes: 1320,
    description: "Sushi-inspired sculpture made entirely of edible materials",
    year: 2022
  },
  {
    id: 33,
    title: "Sweet Geometry",
    artist: "Pastry Chef Leila Hassan",
    artistType: "culinary art",
    imageUrl: "/landing-page/artworks/aw15.jpg",
    likes: 1110,
    description: "Modern dessert design using molecular gastronomy",
    year: 2021
  },
  {
    id: 34,
    title: "Heritage Table",
    artist: "Chef Anwar Ali",
    artistType: "culinary art",
    imageUrl: "/landing-page/artworks/aw16.jpg",
    likes: 1250,
    description: "Multi-course meal inspired by ancestral recipes",
    year: 2020
  },
  {
    id: 35,
    title: "Art of Fermentation",
    artist: "Chef Sofia Jensen",
    artistType: "culinary art",
    imageUrl: "/landing-page/artworks/aw17.jpg",
    likes: 1090,
    description: "Exploration of fermented flavors in contemporary cuisine",
    year: 2023
  },
  {
    id: 36,
    title: "Garden to Plate",
    artist: "Chef Luca Moretti",
    artistType: "culinary art",
    imageUrl: "/landing-page/artworks/aw18.jpg",
    likes: 1400,
    description: "Farm-to-table concept reimagined as edible art",
    year: 2021
  },

  // Functional Art
  {
    id: 37,
    title: "Chair of Whimsy",
    artist: "Elliot Grant",
    artistType: "functional art",
    imageUrl: "/landing-page/artworks/aw19.jpg",
    likes: 980,
    description: "Sculptural chair combining comfort and creativity",
    year: 2023
  },
  {
    id: 38,
    title: "Light Sculpture",
    artist: "Mariana Silva",
    artistType: "functional art",
    imageUrl: "/landing-page/artworks/aw20.jpg",
    likes: 1100,
    description: "Handcrafted lamp doubling as wall art",
    year: 2022
  },
  {
    id: 39,
    title: "Tabletop Illusion",
    artist: "Jin Takahashi",
    artistType: "functional art",
    imageUrl: "/landing-page/artworks/aw21.jpg",
    likes: 1050,
    description: "Coffee table designed like floating puzzle pieces",
    year: 2021
  },
  {
    id: 40,
    title: "Woven Harmony",
    artist: "Zara N'Dour",
    artistType: "functional art",
    imageUrl: "/landing-page/artworks/aw22.jpg",
    likes: 960,
    description: "Handwoven rug that doubles as wall tapestry",
    year: 2020
  },
  {
    id: 41,
    title: "Kitchen as Canvas",
    artist: "Luca Romano",
    artistType: "functional art",
    imageUrl: "/landing-page/artworks/aw23.jpg",
    likes: 1200,
    description: "Custom kitchenware set with artistic detailing",
    year: 2023
  },
  {
    id: 42,
    title: "Doormat Designs",
    artist: "Priya Mehta",
    artistType: "functional art",
    imageUrl: "/landing-page/artworks/aw24.jpg",
    likes: 1010,
    description: "Artistic doormats that welcome and inspire",
    year: 2022
  },

  // Environmental Art
  {
    id: 43,
    title: "Earth Spiral",
    artist: "Liam O'Connor",
    artistType: "environmental art",
    imageUrl: "/landing-page/artworks/aw25.jpg",
    likes: 1400,
    description: "Large-scale land art created using natural elements",
    year: 2023
  },
  {
    id: 44,
    title: "Ice Echoes",
    artist: "Ingrid Voss",
    artistType: "environmental art",
    imageUrl: "/landing-page/artworks/aw26.jpg",
    likes: 1250,
    description: "Temporary ice sculptures documenting climate change",
    year: 2022
  },
  {
    id: 45,
    title: "Forest Canopy",
    artist: "Kiran Reddy",
    artistType: "environmental art",
    imageUrl: "/landing-page/artworks/aw27.jpg",
    likes: 1300,
    description: "Installation weaving color into treetops",
    year: 2021
  },
  {
    id: 46,
    title: "River Threads",
    artist: "Hiroshi Nakamura",
    artistType: "environmental art",
    imageUrl: "/landing-page/artworks/aw28.jpg",
    likes: 1100,
    description: "Textile installation flowing along a riverbank",
    year: 2020
  },
  {
    id: 47,
    title: "Wind Chimes of the Desert",
    artist: "Fatima El-Sayed",
    artistType: "environmental art",
    imageUrl: "/landing-page/artworks/aw29.jpg",
    likes: 1230,
    description: "Site-specific wind chime installation in desert landscape",
    year: 2023
  },
  {
    id: 48,
    title: "Pollinator Garden",
    artist: "Emily Carter",
    artistType: "environmental art",
    imageUrl: "/landing-page/artworks/aw30.jpg",
    likes: 1150,
    description: "Living artworks attracting bees and butterflies",
    year: 2021
  },

  // Film Art
  {
    id: 49,
    title: "Shadows of Truth",
    artist: "Marco Bellini",
    artistType: "film art",
    imageUrl: "/landing-page/artworks/aw13.avif",
    likes: 1600,
    description: "Independent film exploring perception and reality",
    year: 2023
  },
  {
    id: 50,
    title: "City of Dreams",
    artist: "Leah Thompson",
    artistType: "film art",
    imageUrl: "/landing-page/artworks/aw14.jpg",
    likes: 1450,
    description: "Documentary-style feature on urban life",
    year: 2022
  },
  {
    id: 51,
    title: "The Last Light",
    artist: "Samuel Greene",
    artistType: "film art",
    imageUrl: "/landing-page/artworks/aw15.jpg",
    likes: 1300,
    description: "Sci-fi short film about time and memory",
    year: 2021
  },
  {
    id: 52,
    title: "Beneath the Surface",
    artist: "Anya Petrova",
    artistType: "film art",
    imageUrl: "/landing-page/artworks/aw16.jpg",
    likes: 1500,
    description: "Psychological drama told through surreal visuals",
    year: 2020
  },
  {
    id: 53,
    title: "Echoes of War",
    artist: "James Holloway",
    artistType: "film art",
    imageUrl: "/landing-page/artworks/aw17.jpg",
    likes: 1400,
    description: "War documentary with cinematic storytelling",
    year: 2023
  },
  {
    id: 54,
    title: "Beyond the Horizon",
    artist: "Sophie Duval",
    artistType: "film art",
    imageUrl: "/landing-page/artworks/aw18.jpg",
    likes: 1350,
    description: "Adventure film following explorers across continents",
    year: 2022
  },

  // Cross-Disciplinary Art
  {
    id: 55,
    title: "Convergence",
    artist: "Elias Navarro",
    artistType: "cross-disciplinary art",
    imageUrl: "/landing-page/artworks/aw19.jpg",
    likes: 1700,
    description: "Combining painting, music, and dance into one performance",
    year: 2023
  },
  {
    id: 56,
    title: "Intersections",
    artist: "Rebecca Song",
    artistType: "cross-disciplinary art",
    imageUrl: "/landing-page/artworks/aw20.jpg",
    likes: 1550,
    description: "Interactive exhibit fusing tech, fashion, and fine art",
    year: 2022
  },
  {
    id: 57,
    title: "Mind Mosaic",
    artist: "Aditi Rao",
    artistType: "cross-disciplinary art",
    imageUrl: "/landing-page/artworks/aw21.jpg",
    likes: 1400,
    description: "Collaborative project between neuroscientists and artists",
    year: 2021
  },
  {
    id: 58,
    title: "Time Capsule",
    artist: "Gabriel Ortega",
    artistType: "cross-disciplinary art",
    imageUrl: "/landing-page/artworks/aw22.jpg",
    likes: 1600,
    description: "Installation combining sculpture, sound, and video",
    year: 2020
  },
  {
    id: 59,
    title: "Dialogue of Forms",
    artist: "Camille Dubois",
    artistType: "cross-disciplinary art",
    imageUrl: "/landing-page/artworks/aw23.jpg",
    likes: 1500,
    description: "Art-science collaboration exploring biodiversity",
    year: 2023
  },
  {
    id: 60,
    title: "Fractals of Culture",
    artist: "Naveen Kapoor",
    artistType: "cross-disciplinary art",
    imageUrl: "/landing-page/artworks/aw24.jpg",
    likes: 1450,
    description: "Cultural art fusion using textiles, music, and storytelling",
    year: 2022
  }
];