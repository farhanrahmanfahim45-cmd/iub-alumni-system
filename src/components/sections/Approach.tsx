import { SectionHeading } from "../SectionHeading";
import { ApproachFlow } from "../ApproachFlow";

export function Approach() {
  return (
    <section id="approach" className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          align="center"
          eyebrow="Signature Approach"
          title="Business → Data → Insight → Decision"
          description="My role isn't just to build dashboards — it's to connect business problems with data-driven decisions."
          className="mx-auto"
        />
        <div className="mt-16">
          <ApproachFlow />
        </div>
      </div>
    </section>
  );
}
