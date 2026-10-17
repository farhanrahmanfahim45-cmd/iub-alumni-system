import { Mail, ArrowUp } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "./BrandIcons";
import { site } from "../data/site";

export function Footer() {
  return (
    <footer className="border-t border-line bg-surface-alt">
      <div className="container-page py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <p className="font-display font-semibold text-ink">{site.name}</p>
          <p className="text-sm text-body mt-1">{site.identity}</p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`mailto:${site.email}`}
            aria-label="Email"
            className="h-10 w-10 flex items-center justify-center rounded-full border border-line text-body hover:text-purple-600 hover:border-purple-300 transition-colors"
          >
            <Mail size={16} />
          </a>
          <a
            href={site.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn"
            className="h-10 w-10 flex items-center justify-center rounded-full border border-line text-body hover:text-purple-600 hover:border-purple-300 transition-colors"
          >
            <LinkedinIcon size={16} />
          </a>
          <a
            href={site.github}
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
            className="h-10 w-10 flex items-center justify-center rounded-full border border-line text-body hover:text-purple-600 hover:border-purple-300 transition-colors"
          >
            <GithubIcon size={16} />
          </a>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="h-10 w-10 flex items-center justify-center rounded-full bg-ink text-white hover:bg-purple-600 transition-colors"
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="container-page py-5 text-xs text-body/70 flex flex-col sm:flex-row gap-2 justify-between">
          <span>© {new Date().getFullYear()} {site.name}. All rights reserved.</span>
          <span>Built with React, TypeScript & Tailwind CSS.</span>
        </div>
      </div>
    </footer>
  );
}
