// index/cta

import { motion } from "framer-motion";

export default function CallToAction() {
  return (
    <motion.section
      className="bg-primary text-white py-20"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <div className="container mx-auto px-6 text-center">
        <motion.h2
          className="text-3xl md:text-4xl font-bold mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Ready to join the creative community?
        </motion.h2>
        <motion.p
          className="mb-8 opacity-90 text-lg"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.9 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          ArtChive is free to join and always will be.
        </motion.p>
        <motion.button
          className="btn btn-light btn-wide text-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Join ArtChive Free
        </motion.button>
      </div>
    </motion.section>
  );
}
