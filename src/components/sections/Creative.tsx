import { useState } from "react";
import { creativeWork } from "../../data/creative";
import { SectionHeading } from "../SectionHeading";
import { CreativeCard } from "../CreativeCard";
import { Lightbox } from "../Lightbox";
import type { CreativeItem } from "../../data/creative";

export function Creative() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const imageItems = creativeWork.filter((c) => c.image);
  const images = imageItems.map((c) => ({
    src: c.image,
    caption: c.description ? `${c.title} — ${c.description}` : c.title,
  }));

  function handleOpen(item: CreativeItem) {
    const idx = imageItems.findIndex((c) => c.id === item.id);
    if (idx !== -1) setActiveIndex(idx);
  }

  return (
    <section id="creative" className="py-20 sm:py-28 bg-surface-alt border-y border-line-soft">
      <div className="container-page">
        <SectionHeading
          eyebrow="Creative Work"
          title="Selected Visual Work"
          description="Supporting evidence of visual communication and design ability — separate from the analytics work above."
        />
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {creativeWork.map((item, i) => (
            <CreativeCard key={item.id} item={item} index={i} onOpen={handleOpen} />
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
