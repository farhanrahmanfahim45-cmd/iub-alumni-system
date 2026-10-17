import { motion } from "framer-motion";
import { GraduationCap, Sparkles } from "lucide-react";
import { site } from "../../data/site";
import { SectionHeading } from "../SectionHeading";

export function About() {
  return (
    <section id="about" className="py-20 sm:py-28">
      <div className="container-page grid lg:grid-cols-[0.9fr_1.1fr] gap-12 items-start">
        <SectionHeading eyebrow="About" title="Business understanding meets technical analytics" />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <p className="text-base sm:text-[17px] leading-relaxed text-body text-balance">
            {site.about}
          </p>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="h-9 w-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
                <GraduationCap size={17} />
              </div>
              <p className="text-sm font-semibold text-ink">Management Information Systems</p>
              <p className="text-xs text-body mt-1">
                BBA, Independent University, Bangladesh — Minor in International Business
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white p-5">
              <div className="h-9 w-9 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 mb-3">
                <Sparkles size={17} />
              </div>
              <p className="text-sm font-semibold text-ink">Business + Technology</p>
              <p className="text-xs text-body mt-1">
                Practical project experience across SQL, Python, Power BI and Excel.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
