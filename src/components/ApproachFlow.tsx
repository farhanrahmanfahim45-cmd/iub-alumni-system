import { motion } from "framer-motion";
import { approachSteps } from "../data/site";

export function ApproachFlow() {
  return (
    <div className="relative">
      {/* Desktop: horizontal flow */}
      <div className="hidden md:grid grid-cols-5 gap-4 relative">
        <div
          aria-hidden
          className="absolute top-[27px] left-[10%] right-[10%] h-px bg-gradient-to-r from-purple-200 via-purple-400 to-purple-200"
        />
        {approachSteps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.45, delay: i * 0.1, ease: "easeOut" }}
            className="relative flex flex-col items-center text-center px-2"
          >
            <div className="relative z-10 h-14 w-14 rounded-full bg-white border-2 border-purple-400 flex items-center justify-center font-display font-bold text-purple-600 shadow-[0_0_0_6px_rgba(124,63,228,0.06)]">
              {step.number}
            </div>
            <h4 className="mt-4 font-display text-sm font-semibold text-ink">{step.title}</h4>
            <p className="mt-1.5 text-xs leading-relaxed text-body">{step.description}</p>
          </motion.div>
        ))}
      </div>

      {/* Mobile: vertical flow */}
      <div className="md:hidden flex flex-col gap-0">
        {approachSteps.map((step, i) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className="flex gap-4"
          >
            <div className="flex flex-col items-center">
              <div className="h-11 w-11 shrink-0 rounded-full bg-white border-2 border-purple-400 flex items-center justify-center font-display font-bold text-sm text-purple-600">
                {step.number}
              </div>
              {i < approachSteps.length - 1 && (
                <div className="w-px flex-1 bg-purple-200 my-1" />
              )}
            </div>
            <div className="pb-8">
              <h4 className="font-display text-sm font-semibold text-ink pt-1.5">{step.title}</h4>
              <p className="mt-1 text-xs leading-relaxed text-body">{step.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
