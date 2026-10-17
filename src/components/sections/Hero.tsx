import { motion } from "framer-motion";
import { ArrowRight, FileDown, ChevronDown } from "lucide-react";
import { site } from "../../data/site";
import { Button } from "../Button";

const flowSteps = ["BUSINESS", "DATA", "ANALYSIS", "INSIGHT", "DECISION"];

export function Hero() {
  return (
    <section
      id="home"
      className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden bg-grain"
    >
      {/* Background wash */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-b from-purple-50 via-white to-white"
      />
      <div
        aria-hidden
        className="absolute -top-24 right-[-10%] -z-10 h-[420px] w-[420px] rounded-full bg-cyan-100/60 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute top-40 left-[-15%] -z-10 h-[380px] w-[380px] rounded-full bg-purple-100/70 blur-3xl"
      />

      <div className="container-page grid lg:grid-cols-[1.15fr_0.85fr] gap-16 items-center">
        <div>
          <motion.img
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            src={site.profileImage}
            alt={site.name}
            className="h-24 w-24 sm:h-28 sm:w-28 rounded-full object-cover border-4 border-white shadow-card mb-6"
          />

          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] uppercase text-purple-600 bg-purple-50 border border-purple-100 rounded-full px-3.5 py-1.5"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
            Aspiring Data Analyst &amp; BI Professional
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="mt-6 font-display font-semibold text-4xl sm:text-5xl lg:text-[3.4rem] leading-[1.08] tracking-tight text-ink text-balance"
          >
            {site.name}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
            className="mt-3 font-display text-xl sm:text-2xl font-medium text-purple-600"
          >
            {site.identity}
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.26 }}
            className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-body text-balance"
          >
            {site.valueProposition}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.34 }}
            className="mt-6 flex flex-wrap items-center gap-2"
          >
            {site.toolkit.map((tool, i) => (
              <span key={tool} className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink-soft bg-white border border-line rounded-full px-3.5 py-1.5 shadow-sm">
                  {tool}
                </span>
                {i < site.toolkit.length - 1 && (
                  <span className="text-purple-300 text-xs">&middot;</span>
                )}
              </span>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.42 }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <Button href="#work" icon={<ArrowRight size={16} />}>
              Explore My Work
            </Button>
            <Button
              href={site.resumeUrl}
              target="_blank"
              rel="noreferrer"
              variant="outline"
              icon={<FileDown size={16} />}
            >
              View Resume
            </Button>
          </motion.div>
        </div>

        {/* Signature data-flow visual */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative mx-auto w-full max-w-xs"
        >
          <div className="rounded-2xl border border-line bg-white/80 backdrop-blur-sm shadow-card p-6 sm:p-7">
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase text-body/60 mb-5">
              How I Work
            </p>
            <ol className="relative">
              {flowSteps.map((step, i) => (
                <li key={step} className="relative pl-8 pb-6 last:pb-0">
                  {i < flowSteps.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute left-[9px] top-6 bottom-0 w-px bg-gradient-to-b from-purple-300 to-purple-100"
                    />
                  )}
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.35, delay: 0.5 + i * 0.14, type: "spring" }}
                    className="absolute left-0 top-0.5 h-[19px] w-[19px] rounded-full bg-purple-500 flex items-center justify-center"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  </motion.span>
                  <motion.span
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.55 + i * 0.14 }}
                    className="font-display text-sm font-semibold tracking-wide text-ink"
                  >
                    {step}
                  </motion.span>
                </li>
              ))}
            </ol>
          </div>
          <div
            aria-hidden
            className="absolute -bottom-4 -right-4 h-24 w-24 rounded-2xl bg-cyan-100/70 -z-10"
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="hidden sm:flex justify-center mt-16"
      >
        <a
          href="#work"
          aria-label="Scroll to Selected Work"
          className="flex flex-col items-center gap-1 text-body/50 hover:text-purple-500 transition-colors"
        >
          <span className="text-[11px] tracking-widest uppercase">Scroll</span>
          <ChevronDown size={16} className="animate-bounce" />
        </a>
      </motion.div>
    </section>
  );
}
