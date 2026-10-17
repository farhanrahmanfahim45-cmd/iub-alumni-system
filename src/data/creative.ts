// Creative Work (PRD section 21-22) — supporting evidence only, never the
// primary portfolio category.

export interface CreativeItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  image: string; // path under /public/creative/, or "" for placeholder
  canvaUrl?: string;
}

export const creativeWork: CreativeItem[] = [
  {
    id: "iibf-cardiff-career-talk",
    title: "\"Building a Global Career\" Event Poster",
    description:
      "Promotional poster for an IIBF x MACES x Cardiff University session on career skills, featuring speaker David Evans, Regional Manager (South Asia, CIS & Europe).",
    category: "Event Poster",
    image: "/creative/iibf-cardiff-career-talk-poster.webp",
  },
  {
    id: "iibf-executive-panel-2025",
    title: "Executive Panel 2025 — Team Announcement",
    description:
      "Playful, role-based team reveal graphic introducing the IIBF Executive Panel 2025 and their functional titles.",
    category: "Social Media Graphic",
    image: "/creative/iibf-executive-panel-2025.webp",
  },
  {
    id: "iibf-campus-ambassador-announcement",
    title: "Campus Ambassador Congratulations Post",
    description:
      "Congratulatory social media graphic recognizing an IIBF member's selection as a NextJobz Campus Ambassador.",
    category: "Social Media Graphic",
    image: "/creative/iibf-campus-ambassador-announcement.webp",
  },
];

