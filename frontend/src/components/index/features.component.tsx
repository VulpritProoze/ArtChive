// index/features
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPortrait,
  faUsers,
  faComments,
  faChartLine,
} from "@fortawesome/free-solid-svg-icons";

export default function Features() {
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
        <h2 className="text-3xl font-bold mb-12">
          Why Artists Love ArtChive
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="card bg-base-100 shadow-md p-6 rounded-box hover:shadow-lg transition-shadow duration-300"
            >
              <div className="text-primary text-4xl mb-4">
                <FontAwesomeIcon icon={feature.icon} />
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="opacity-70">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}