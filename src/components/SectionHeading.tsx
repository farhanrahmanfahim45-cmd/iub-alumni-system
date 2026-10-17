import { motion } from "framer-motion";
import { cn } from "../lib/cn";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: SectionHeadingProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      {eyebrow && (
        <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-purple-600 mb-3">
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-ink text-balance">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-base sm:text-[17px] leading-relaxed text-body text-balance">
          {description}
        </p>
      )}
    </motion.div>
  );
}
