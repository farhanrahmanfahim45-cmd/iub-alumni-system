import { motion } from "framer-motion";
import { Mail, FileDown, ArrowUpRight } from "lucide-react";
import { GithubIcon, LinkedinIcon } from "../BrandIcons";
import { site } from "../../data/site";
import { SectionHeading } from "../SectionHeading";
import { Button } from "../Button";

export function Contact() {
  return (
    <section id="contact" className="py-20 sm:py-28">
      <div className="container-page">
        <div className="relative rounded-3xl border border-line bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 px-6 py-14 sm:px-14 sm:py-20 overflow-hidden">
          <div
            aria-hidden
            className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-cyan-300/20 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-purple-300/20 blur-3xl"
          />

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="relative max-w-2xl"
          >
            <SectionHeading
              eyebrow="Contact"
              title="Let's talk data, business or opportunities"
              description="Open to Data Analyst, BI Analyst and Business Analyst roles and internships — reach out directly or connect on LinkedIn."
              className="[&_span]:text-purple-100 [&_span]:bg-white/10 [&_span]:border-white/10 [&_h2]:text-white [&_p]:text-purple-100"
            />

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                href={`mailto:${site.email}`}
                variant="primary"
                className="bg-white text-purple-700 hover:bg-purple-50 shadow-none"
                icon={<Mail size={16} />}
              >
                Email Me
              </Button>
              <Button
                href={site.linkedin}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:border-white hover:text-white hover:bg-white/10"
                icon={<LinkedinIcon size={16} />}
              >
                LinkedIn
              </Button>
              <Button
                href={site.github}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:border-white hover:text-white hover:bg-white/10"
                icon={<GithubIcon size={16} />}
              >
                GitHub
              </Button>
              <Button
                href={site.resumeUrl}
                target="_blank"
                rel="noreferrer"
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:border-white hover:text-white hover:bg-white/10"
                icon={<FileDown size={16} />}
              >
                Resume
              </Button>
            </div>

            <a
              href={`mailto:${site.email}`}
              className="mt-8 inline-flex items-center gap-2 text-purple-100 hover:text-white text-sm font-medium transition-colors group"
            >
              {site.email}
              <ArrowUpRight
                size={14}
                className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
