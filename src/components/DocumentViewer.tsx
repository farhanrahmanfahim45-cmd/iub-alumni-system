import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ExternalLink } from "lucide-react";

interface DocumentViewerProps {
  url: string | null;
  title?: string;
  onClose: () => void;
}

// Renders a PDF only when opened (lazy-loaded), per PRD performance
// requirements — never embedded directly in cards.
export function DocumentViewer({ url, title, onClose }: DocumentViewerProps) {
  const isOpen = url !== null;

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && url && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-ink/90 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-line">
              <span className="text-sm font-medium text-ink truncate">{title ?? "Document"}</span>
              <div className="flex items-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 w-9 flex items-center justify-center rounded-full text-body hover:bg-purple-50 hover:text-purple-600 transition-colors"
                  aria-label="Open in new tab"
                >
                  <ExternalLink size={16} />
                </a>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="h-9 w-9 flex items-center justify-center rounded-full text-body hover:bg-purple-50 hover:text-purple-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <iframe title={title ?? "document"} src={url} className="flex-1 w-full" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
