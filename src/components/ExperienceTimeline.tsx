import { motion } from "framer-motion";
import { Briefcase } from "lucide-react";
import type { ExperienceEntry } from "../data/experience";

interface ExperienceTimelineProps {
  entries: ExperienceEntry[];
}

export function ExperienceTimeline({ entries }: ExperienceTimelineProps) {
  return (
    <div className="relative">
      <div
        aria-hidden
        className="absolute left-[19px] top-2 bottom-2 w-px bg-line"
      />
      <ul className="space-y-8">
        {entries.map((entry, i) => (
          <motion.li
            key={entry.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
            className="relative pl-14"
          >
            <div className="absolute left-0 top-0 h-10 w-10 rounded-full bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
              <Briefcase size={16} />
            </div>

            <div className="rounded-2xl border border-line bg-white p-5 sm:p-6 hover:border-purple-200 hover:shadow-card transition-all duration-300">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold text-ink">
                  {entry.organization}
                </h3>
                {entry.location && (
                  <span className="text-xs text-body">{entry.location}</span>
                )}
              </div>

              <div className="mt-2 space-y-1">
                {entry.roles.map((r) => (
                  <div key={r.role} className="flex flex-wrap items-baseline gap-2">
                    <span className="text-sm font-medium text-purple-600">{r.role}</span>
                    <span className="text-xs text-body/80">{r.period}</span>
                  </div>
                ))}
              </div>

              <ul className="mt-3 space-y-1.5">
                {entry.points.map((point) => (
                  <li key={point} className="text-sm text-body leading-relaxed pl-4 relative">
                    <span className="absolute left-0 top-[0.55em] h-1 w-1 rounded-full bg-purple-300" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
