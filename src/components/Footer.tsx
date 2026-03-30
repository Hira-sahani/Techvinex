import { Link, useNavigate } from "react-router-dom";

const footerLinks = {
  Product: [
    { label: "APEX", to: "/home", hash: "apex" },
    { label: "Explore Roles", to: "/explore" },
    { label: "Enterprise", to: "/home", hash: "cta" },
    { label: "Blog", to: "/home", hash: "stories" },
  ],
  Company: [
    { label: "About", to: "/home", hash: "features" },
    { label: "Careers", to: "/explore" },
    { label: "Press", to: "/home", hash: "cta" },
    { label: "Contact", to: "/home", hash: "cta" },
  ],
  Legal: [
    { label: "Privacy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
    { label: "Cookie Policy", to: "/cookie-policy" },
  ],
  Social: [
    { label: "Twitter", to: "https://twitter.com", isExternal: true },
    { label: "LinkedIn", to: "https://linkedin.com", isExternal: true },
    { label: "GitHub", to: "https://github.com", isExternal: true },
  ],
};

const Footer = () => {
  const navigate = useNavigate();

  const handleClick = (link: { to: string; hash?: string; isExternal?: boolean }) => {
    if (link.isExternal) {
      window.open(link.to, "_blank", "noopener,noreferrer");
      return;
    }

    if (link.hash) {
      navigate(link.to);
      // Small delay to ensure page loads, then scroll to section
      setTimeout(() => {
        const el = document.getElementById(link.hash!);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        } else {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);
    } else {
      navigate(link.to);
    }
  };

  return (
    <footer className="border-t border-border py-8 sm:py-12 px-3 sm:px-4 mb-16 md:mb-0">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-10">
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <button
                      onClick={() => handleClick(link)}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
                    >
                      {link.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">X</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            © 2026 Jetra X. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
