import { experience } from "../../data/experience";
import { SectionHeading } from "../SectionHeading";
import { ExperienceTimeline } from "../ExperienceTimeline";

export function ExperienceSection() {
  return (
    <section id="experience" className="py-20 sm:py-28 bg-surface-alt border-y border-line-soft">
      <div className="container-page">
        <SectionHeading
          eyebrow="Experience"
          title="A curated professional timeline"
          description="Roles that shaped how I approach problems — organizational leadership, brand strategy and content."
        />
        <div className="mt-12 max-w-2xl">
          <ExperienceTimeline entries={experience} />
        </div>
      </div>
    </section>
  );
}
