import { useState } from "react";
import { achievements } from "../../data/achievements";
import { SectionHeading } from "../SectionHeading";
import { RecognitionCard } from "../RecognitionCard";
import { Lightbox } from "../Lightbox";
import type { Achievement } from "../../data/achievements";

export function Recognition() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const proofItems = achievements.filter((a) => a.proofImage);
  const images = proofItems.map((a) => ({
    src: a.proofImage as string,
    caption: `${a.title} — ${a.organization}`,
  }));

  function handleViewProof(achievement: Achievement) {
    const idx = proofItems.findIndex((a) => a.id === achievement.id);
    if (idx !== -1) setActiveIndex(idx);
  }

  return (
    <section id="recognition" className="py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow="Recognition"
          title="Proof, not a certificate wall"
          description="A selection of verified achievements that support the work above."
        />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {achievements.map((achievement, i) => (
            <RecognitionCard
              key={achievement.id}
              achievement={achievement}
              index={i}
              onViewProof={handleViewProof}
            />
          ))}
        </div>
      </div>

      <Lightbox
        images={images}
        index={activeIndex}
        onClose={() => setActiveIndex(null)}
        onNavigate={setActiveIndex}
      />
    </section>
  );
}
