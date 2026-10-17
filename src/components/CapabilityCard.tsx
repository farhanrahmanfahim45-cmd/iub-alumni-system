import { motion } from "framer-motion";
import type { CapabilityGroup } from "../data/skills";

interface CapabilityCardProps {
  capability: CapabilityGroup;
  index: number;
}

export function CapabilityCard({ capability, index }: CapabilityCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
      className="rounded-2xl border border-line bg-white p-6 hover:border-purple-200 hover:shadow-card transition-all duration-300"
    >
      <span className="font-display text-xs font-semibold tracking-widest text-purple-500">
        {String(index + 1).padStart(2, "0")}
      </span>
      <h3 className="mt-3 font-display text-lg font-semibold text-ink">{capability.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-body">{capability.description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {capability.skills.map((skill) => (
          <span
            key={skill}
            className="text-xs font-medium text-ink-soft bg-surface-lilac rounded-full px-2.5 py-1"
          >
            {skill}
          </span>
        ))}
      </div>
    </motion.div>
  );
}
