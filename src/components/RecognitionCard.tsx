import { motion } from "framer-motion";
import { Award, Eye } from "lucide-react";
import type { Achievement } from "../data/achievements";

interface RecognitionCardProps {
  achievement: Achievement;
  index: number;
  onViewProof: (achievement: Achievement) => void;
}

export function RecognitionCard({ achievement, index, onViewProof }: RecognitionCardProps) {
  const hasProof = Boolean(achievement.proofImage);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
      className="rounded-2xl border border-line bg-white overflow-hidden hover:border-purple-200 hover:shadow-card transition-all duration-300 flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-surface-lilac overflow-hidden">
        {hasProof ? (
          <img
            src={achievement.proofImage}
            alt={`Proof of ${achievement.title} — ${achievement.organization}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center text-purple-300">
            <Award size={32} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-display text-base font-semibold text-ink">{achievement.title}</h3>
        <p className="mt-1 text-sm text-body leading-snug">{achievement.organization}</p>

        {hasProof ? (
          <button
            onClick={() => onViewProof(achievement)}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
          >
            <Eye size={15} />
            View Proof
          </button>
        ) : (
          <span className="mt-4 inline-block text-xs text-body/60 italic">
            Proof available on request
          </span>
        )}
      </div>
    </motion.div>
  );
}
