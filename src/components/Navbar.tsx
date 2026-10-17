import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, FileText } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "./BrandIcons";
import { site, navLinks } from "../data/site";
import { cn } from "../lib/cn";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleNavClick(e: React.MouseEvent, href: string) {
    setOpen(false);
    if (isHome) {
      e.preventDefault();
      const el = document.querySelector(href);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      e.preventDefault();
      navigate("/" + href);
    }
  }

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/85 backdrop-blur-md border-b border-line shadow-[0_1px_0_rgba(20,18,31,0.02)]"
          : "bg-transparent"
      )}
    >
      <nav className="container-page flex items-center justify-between h-16 sm:h-[72px]">
        <Link
          to="/"
          className="font-display font-semibold text-[15px] sm:text-base tracking-tight text-ink flex items-center gap-2"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500 text-white text-sm font-bold font-display">
            F
          </span>
          <span className="hidden sm:inline">Farhan Rahman Fahim</span>
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={isHome ? link.href : "/" + link.href}
                onClick={(e) => handleNavClick(e, link.href)}
                className="px-3.5 py-2 text-sm font-medium text-body hover:text-purple-600 rounded-full hover:bg-purple-50 transition-colors"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-1.5">
          <a
            href={site.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="h-9 w-9 flex items-center justify-center rounded-full text-body hover:text-purple-600 hover:bg-purple-50 transition-colors"
          >
            <LinkedinIcon size={17} />
          </a>
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="h-9 w-9 flex items-center justify-center rounded-full text-body hover:text-purple-600 hover:bg-purple-50 transition-colors"
          >
            <GithubIcon size={17} />
          </a>
          <a
            href={site.resumeUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-ink text-white text-sm font-medium px-4 py-2.5 hover:bg-purple-700 transition-colors"
          >
            <FileText size={15} />
            Resume
          </a>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden h-10 w-10 flex items-center justify-center text-ink"
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden bg-white border-t border-line px-5 pb-6 pt-2">
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={isHome ? link.href : "/" + link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="block py-3 text-base font-medium text-ink border-b border-line-soft"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 mt-5">
            <a
              href={site.linkedin}
              target="_blank"
              rel="noreferrer"
              className="h-11 w-11 flex items-center justify-center rounded-full border border-line text-body"
            >
              <LinkedinIcon size={18} />
            </a>
            <a
              href={site.github}
              target="_blank"
              rel="noreferrer"
              className="h-11 w-11 flex items-center justify-center rounded-full border border-line text-body"
            >
              <GithubIcon size={18} />
            </a>
            <a
              href={site.resumeUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-ink text-white text-sm font-medium px-4 py-3"
            >
              <FileText size={16} />
              Resume
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
