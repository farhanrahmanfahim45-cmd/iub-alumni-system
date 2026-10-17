import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "../data/projects";

interface ProjectCardProps {
  project: Project;
  index: number;
}

const cardClasses =
  "group block rounded-2xl border border-line bg-white overflow-hidden shadow-card hover:shadow-card-hover hover:-translate-y-1 hover:border-purple-200 transition-all duration-300";

export function ProjectCard({ project, index }: ProjectCardProps) {
  const liveUrl = project.links.live;

  // The preview image, shared by both card layouts.
  const preview = (
    <div className="relative aspect-[16/10] overflow-hidden bg-surface-lilac">
      <img
        src={project.coverImage}
        alt={`${project.title} preview`}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <span className="absolute top-4 left-4 font-display text-xs font-semibold tracking-widest text-white bg-ink/70 backdrop-blur-sm rounded-full px-2.5 py-1">
        {project.number}
      </span>
      <span className="absolute top-4 right-4 text-[11px] font-medium tracking-wide text-white bg-purple-600/90 backdrop-blur-sm rounded-full px-2.5 py-1">
        {project.role}
      </span>
      {liveUrl && (
        <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink bg-white/95 rounded-full px-3 py-1.5 shadow-sm opacity-0 translate-y-1 group-hover/preview:opacity-100 group-hover/preview:translate-y-0 transition-all duration-300">
          Open live project
          <ArrowUpRight size={13} />
        </span>
      )}
    </div>
  );

  const body = (
    <div className="p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold text-ink group-hover:text-purple-600 transition-colors">
        {project.shortTitle}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-body line-clamp-3">
        {project.cardDescription}
      </p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {project.tools.map((tool) => (
          <span
            key={tool}
            className="text-[11px] font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-2.5 py-1"
          >
            {tool}
          </span>
        ))}
      </div>

      {project.featuredMetric && (
        <div className="mt-5 pt-4 border-t border-line-soft flex items-baseline gap-2">
          <span className="font-display text-xl font-bold text-ink">
            {project.featuredMetric.value}
          </span>
          <span className="text-xs text-body">{project.featuredMetric.label}</span>
        </div>
      )}

      <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-purple-600">
        {project.depthStars >= 5 ? "Explore Case Study" : "View Details"}
        <ArrowUpRight
          size={15}
          className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
    >
      {liveUrl ? (
        // Live projects: clicking the preview opens the real site in a new tab,
        // clicking the text area opens the details page (description + demo logins).
        <div className={cardClasses}>
          <a
            href={liveUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${project.shortTitle} live in a new tab`}
            className="group/preview block"
          >
            {preview}
          </a>
          <Link to={`/work/${project.slug}`} className="block">
            {body}
          </Link>
        </div>
      ) : (
        <Link to={`/work/${project.slug}`} className={cardClasses}>
          {preview}
          {body}
        </Link>
      )}
    </motion.div>
  );
}
