import { motion } from "framer-motion";
import { ImagePlus } from "lucide-react";
import type { CreativeItem } from "../data/creative";

interface CreativeCardProps {
  item: CreativeItem;
  index: number;
  onOpen: (item: CreativeItem) => void;
}

export function CreativeCard({ item, index, onOpen }: CreativeCardProps) {
  const hasImage = Boolean(item.image);

  return (
    <motion.button
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      onClick={() => hasImage && onOpen(item)}
      className="group relative aspect-square rounded-xl overflow-hidden border border-line bg-surface-lilac text-left disabled:cursor-default"
      disabled={!hasImage}
    >
      {hasImage ? (
        <>
          <img
            src={item.image}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/0 to-ink/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
            <p className="text-white text-sm font-medium">{item.title}</p>
            {item.category && (
              <p className="text-white/70 text-xs mt-0.5">{item.category}</p>
            )}
          </div>
        </>
      ) : (
        <div className="h-full w-full flex flex-col items-center justify-center gap-2 border-2 border-dashed border-purple-200 text-purple-300">
          <ImagePlus size={26} strokeWidth={1.5} />
          <span className="text-[11px] text-center px-3 text-purple-400">{item.title}</span>
        </div>
      )}
    </motion.button>
  );
}
