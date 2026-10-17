import { capabilities } from "../../data/skills";
import { SectionHeading } from "../SectionHeading";
import { CapabilityCard } from "../CapabilityCard";

export function Capabilities() {
  return (
    <section id="capabilities" className="py-20 sm:py-28 bg-surface-alt border-y border-line-soft">
      <div className="container-page">
        <SectionHeading
          eyebrow="Capabilities"
          title="What I Work With"
          description="Skills organized around what they let me do, not arbitrary proficiency scores."
        />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {capabilities.map((cap, i) => (
            <CapabilityCard key={cap.id} capability={cap} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
