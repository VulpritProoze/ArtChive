// index/hero

import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInstagram,
  faTwitter,
  faBehance,
  faLinkedinIn,
} from "@fortawesome/free-brands-svg-icons";

export default function Hero() {
  const socialLinks = [
    { icon: faInstagram, label: "Instagram", url: "#" },
    { icon: faTwitter, label: "Twitter", url: "#" },
    { icon: faBehance, label: "Behance", url: "#" },
    { icon: faLinkedinIn, label: "LinkedIn", url: "#" },
  ];

  return (
    <section className="hero min-h-screen bg-base-200 pt-20">
      <div className="hero-content flex-col lg:flex-row justify-center gap-12 px-6 md:px-12 pt-16">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex-1"
        >
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            A social platform{" "}
            <span className="text-primary">for artists, by artists.</span>
          </h1>
          <motion.p
            className="py-6 text-lg opacity-70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            Join the creative revolution. Showcase your portfolio. Discover
            others.
          </motion.p>
          <motion.div
            className="flex flex-col sm:flex-row gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <motion.button
              className="btn btn-primary"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Get Started
            </motion.button>
            <motion.button
              className="btn btn-outline"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Browse ArtChive
            </motion.button>
          </motion.div>

          <div className="mt-8 flex gap-4">
            {socialLinks.map((social, index) => (
              <motion.a
                key={index}
                href={social.url}
                aria-label={social.label}
                className="btn btn-ghost btn-circle hover:bg-base-300 hover:text-primary"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
              >
                <FontAwesomeIcon icon={social.icon} className="text-xl" />
              </motion.a>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="flex-1"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <motion.img
            src="https://images.unsplash.com/photo-1547891654-e66ed7ebb968?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
            alt="Artist showcase"
            className="rounded-lg shadow-2xl w-full"
            whileHover={{ scale: 1.02 }}
          />
        </motion.div>
      </div>
    </section>
  );
}
