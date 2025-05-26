// index/footer

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function Footer() {
  return (
    <footer className="bg-base-300 text-base-content">
      <div className="container mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img 
                className="w-10 h-10 rounded-lg object-contain" 
                src="favicon/favicon.ico" 
                alt="ArtChive icon" 
              />
              <h2 className="text-xl font-bold hover:text-primary transition-colors">ArtChive</h2>
            </div>
            <p className="mb-4 opacity-80">For artists, by artists. Join the creative revolution.</p>
            <div className="mt-4 flex gap-4">
              <a href="#" aria-label="Instagram">
                <FontAwesomeIcon 
                  icon={['fab', 'instagram']} 
                  className="text-xl hover:text-primary transition-colors" 
                />
              </a>
              <a href="#" aria-label="Twitter">
                <FontAwesomeIcon 
                  icon={['fab', 'twitter']} 
                  className="text-xl hover:text-primary transition-colors" 
                />
              </a>
              <a href="#" aria-label="Behance">
                <FontAwesomeIcon 
                  icon={['fab', 'behance']} 
                  className="text-xl hover:text-primary transition-colors" 
                />
              </a>
              <a href="#" aria-label="LinkedIn">
                <FontAwesomeIcon 
                  icon={['fab', 'linkedin-in']} 
                  className="text-xl hover:text-primary transition-colors" 
                />
              </a>
            </div>
          </div>

          {/* Links Columns */}
          {[
            {
              title: "Product",
              links: ["Features", "Pricing", "Examples", "Updates"]
            },
            {
              title: "Company",
              links: ["About", "Careers", "Press", "Contact"]
            },
            {
              title: "Resources",
              links: ["Blog", "Help Center", "Tutorials", "Community"]
            }
          ].map((section, index) => (
            <div key={index}>
              <h4 className="text-lg font-bold mb-4 hover:text-primary transition-colors cursor-default">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a 
                      href="#" 
                      className="opacity-80 hover:opacity-100 hover:text-primary transition-all flex items-center gap-2"
                    >
                      <span className="w-2 h-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-all"></span>
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-base-200 flex flex-col md:flex-row justify-between items-center">
          <p className="opacity-70 mb-4 md:mb-0">
            © {new Date().getFullYear()} ArtChive. All rights reserved.
          </p>
          <div className="flex gap-6">
            {['Terms', 'Privacy', 'Cookies'].map((item) => (
              <a 
                key={item}
                href="#" 
                className="link link-hover opacity-70 hover:opacity-100 hover:text-primary transition-all"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}