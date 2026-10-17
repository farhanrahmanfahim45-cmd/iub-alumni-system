import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  LayoutDashboard,
  FileText,
  Download,
  Star,
  KeyRound,
  Info,
} from "lucide-react";
import { GithubIcon } from "../components/BrandIcons";
import { getProjectBySlug, projects } from "../data/projects";
import { Lightbox } from "../components/Lightbox";
import { Button } from "../components/Button";
import { SectionHeading } from "../components/SectionHeading";
import { ProjectCard } from "../components/ProjectCard";

export function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const project = slug ? getProjectBySlug(slug) : undefined;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  if (!project) return <Navigate to="/" replace />;

  const otherProjects = projects.filter((p) => p.id !== project.id).slice(0, 2);

  const linkButtons: {
    href: string;
    label: string;
    icon: React.ReactNode;
    variant: "primary" | "outline";
  }[] = [];

  if (project.links.github) {
    linkButtons.push({
      href: project.links.github,
      label: "View on GitHub",
      icon: <GithubIcon size={16} />,
      variant: linkButtons.length === 0 ? "primary" : "outline",
    });
  }
  if (project.links.live) {
    linkButtons.push({
      href: project.links.live,
      label: "Open Live Project",
      icon: <ArrowUpRight size={16} />,
      variant: linkButtons.length === 0 ? "primary" : "outline",
    });
  }
  if (project.links.dashboard) {
    linkButtons.push({
      href: project.links.dashboard,
      label: "View Dashboard",
      icon: <LayoutDashboard size={16} />,
      variant: linkButtons.length === 0 ? "primary" : "outline",
    });
  }
  if (project.links.report) {
    linkButtons.push({
      href: project.links.report,
      label: "View Report",
      icon: <FileText size={16} />,
      variant: linkButtons.length === 0 ? "primary" : "outline",
    });
  }
  if (project.links.download) {
    linkButtons.push({
      href: project.links.download,
      label: "Download Files",
      icon: <Download size={16} />,
      variant: "outline",
    });
  }

  return (
    <>
      <article className="pt-28 sm:pt-32 pb-24">
        {/* Header */}
        <header className="container-page">
          <Link
            to="/#work"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-body hover:text-purple-600 transition-colors"
          >
            <ArrowLeft size={15} />
            Back to Work
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-6 max-w-3xl"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-display text-xs font-semibold tracking-widest text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-3 py-1">
                {project.number} · {project.role}
              </span>
              <span className="flex items-center gap-0.5" aria-label={`Case study depth: ${project.depthStars} of 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={13}
                    className={i < project.depthStars ? "fill-purple-400 text-purple-400" : "text-line"}
                  />
                ))}
              </span>
            </div>

            <h1 className="mt-5 font-display text-3xl sm:text-[2.6rem] font-semibold tracking-tight text-ink text-balance leading-[1.12]">
              {project.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-2">
              {project.tools.map((tool) => (
                <span
                  key={tool}
                  className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full px-3 py-1.5"
                >
                  {tool}
                </span>
              ))}
            </div>

            {linkButtons.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {linkButtons.map((btn) => (
                  <Button
                    key={btn.label}
                    href={btn.href}
                    target="_blank"
                    rel="noreferrer"
                    variant={btn.variant}
                    icon={btn.icon}
                  >
                    {btn.label}
                  </Button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Metrics strip */}
          {project.metrics && project.metrics.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl"
            >
              {project.metrics.map((m) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-line bg-white p-4 sm:p-5"
                >
                  <p className="font-display text-xl sm:text-2xl font-bold text-ink">
                    {m.value}
                  </p>
                  <p className="text-xs text-body mt-1">{m.label}</p>
                </div>
              ))}
            </motion.div>
          )}
        </header>

        {/* Prototype notice + demo logins */}
        {(project.disclaimer || project.demoAccess) && (
          <div className="container-page mt-10 max-w-3xl space-y-4">
            {project.disclaimer && (
              <div className="flex gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 sm:p-5">
                <Info size={18} className="mt-0.5 shrink-0 text-purple-600" />
                <p className="text-sm leading-relaxed text-ink-soft">
                  {project.disclaimer}
                </p>
              </div>
            )}
            {project.demoAccess && (
              <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 shadow-card">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-purple-600" />
                  <h2 className="font-display text-lg font-semibold text-ink">
                    {project.demoAccess.heading}
                  </h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-body">
                  {project.demoAccess.intro}
                </p>
                <div className="mt-4 overflow-x-auto rounded-xl border border-line">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-surface-lilac text-xs uppercase tracking-wider text-body">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Role</th>
                        <th className="px-4 py-2.5 font-semibold">Sign in with</th>
                      </tr>
                    </thead>
                    <tbody>
                      {project.demoAccess.rows.map((row) => (
                        <tr key={row.role} className="border-t border-line-soft">
                          <td className="px-4 py-3 font-medium text-ink">{row.role}</td>
                          <td className="px-4 py-3 font-mono text-[13px] text-ink-soft">
                            {row.signIn}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-sm text-body">
                  Password:{" "}
                  <code className="rounded-md bg-purple-50 border border-purple-100 px-2 py-1 font-mono text-[13px] text-purple-700">
                    {project.demoAccess.password}
                  </code>
                </p>
                {project.demoAccess.note && (
                  <p className="mt-3 text-xs italic text-body/60">
                    {project.demoAccess.note}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Gallery */}
        <div className="container-page mt-14 sm:mt-16">
          <h2 className="font-display text-lg font-semibold text-ink mb-5">
            {project.filterTags.includes("Web App") ? "Preview" : "Visual Results"}
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {project.gallery.map((img, i) => (
              <button
                key={img.src}
                onClick={() => setLightboxIndex(i)}
                className={`group text-left rounded-2xl overflow-hidden border border-line bg-surface-lilac ${
                  i === 0 ? "sm:col-span-2" : ""
                }`}
              >
                <div className="relative overflow-hidden">
                  <img
                    src={img.src}
                    alt={img.caption}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-ink/0 group-hover:bg-ink/10 transition-colors duration-300" />
                </div>
                <p className="px-4 py-3 text-sm text-body">{img.caption}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Case study body */}
        <div className="container-page mt-16 sm:mt-20 grid lg:grid-cols-[220px_1fr] gap-10">
          <nav className="hidden lg:block sticky top-28 self-start">
            <p className="text-xs font-semibold tracking-widest uppercase text-body/50 mb-3">
              On this page
            </p>
            <ul className="space-y-2">
              {project.caseStudy.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm text-body hover:text-purple-600 transition-colors"
                  >
                    {section.heading}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="max-w-2xl space-y-14">
            {project.caseStudy.map((section) => (
              <motion.section
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.45 }}
                className="scroll-mt-28"
              >
                <h3 className="font-display text-xl font-semibold text-ink">
                  {section.heading}
                </h3>
                {section.body?.map((para, i) => (
                  <p key={i} className="mt-3 text-[15px] leading-relaxed text-body">
                    {para}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-2.5">
                    {section.bullets.map((b, i) => (
                      <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-body">
                        <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                {section.note && (
                  <p className="mt-3 text-xs text-body/60 italic border-l-2 border-purple-200 pl-3">
                    {section.note}
                  </p>
                )}
              </motion.section>
            ))}
          </div>
        </div>
      </article>

      <Lightbox
        images={project.gallery}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />

      {/* Other projects */}
      {otherProjects.length > 0 && (
        <section className="py-20 border-t border-line bg-surface-alt">
          <div className="container-page">
            <SectionHeading eyebrow="Continue Exploring" title="Other projects" />
            <div className="mt-10 grid sm:grid-cols-2 gap-6 max-w-3xl">
              {otherProjects.map((p, i) => (
                <ProjectCard key={p.id} project={p} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
