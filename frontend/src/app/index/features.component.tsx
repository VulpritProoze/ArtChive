// index/features

import { motion } from "framer-motion";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPortrait,
  faUsers,
  faComments,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

export default function Features() {
  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const features = [
    {
      icon: faPortrait,
      title: "Build Your Portfolio",
      desc: "Showcase your work in a beautiful, customizable portfolio that grows with your career.",
    },
    {
      icon: faUsers,
      title: "Find Collaborators",
      desc: "Connect with other artists for projects, feedback, and creative partnerships.",
    },
    {
      icon: faComments,
      title: "Join Discussions",
      desc: "Participate in vibrant conversations about techniques, trends, and the creative process.",
    },
    {
      icon: faChartLine,
      title: "Grow Your Audience",
      desc: "Get discovered by collectors, galleries, and fellow artists from around the world.",
    },
  ];

  return (
    <section id="features" className="py-20 bg-base-200">
      <div className="container mx-auto px-6 text-center">
        <motion.h2
          className="text-3xl font-bold mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          Why Artists Love ArtChive
        </motion.h2>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="card bg-base-100 shadow-md p-6 rounded-box hover:shadow-lg transition-all duration-300"
              variants={itemVariants}
              whileHover={{ y: -10 }}
            >
              <div className="text-primary text-4xl mb-4">
                <FontAwesomeIcon icon={feature.icon} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="opacity-70">{feature.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
