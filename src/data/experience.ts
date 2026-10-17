// Curated experience timeline (PRD section 18) — intentionally NOT a full
// resume dump. Each entry supports the professional/analytics narrative.

export interface ExperienceRole {
  role: string;
  period: string;
}

export interface ExperienceEntry {
  id: string;
  organization: string;
  roles: ExperienceRole[]; // most recent first
  location?: string;
  points: string[];
}

export const experience: ExperienceEntry[] = [
  {
    id: "iibf",
    organization: "Independent International Business Forum (IIBF)",
    location: "Dhaka, Bangladesh",
    roles: [
      { role: "Treasurer", period: "Aug 2026 – Present" },
      { role: "Executive, Media & Communications", period: "Jun 2025 – Jul 2026" },
    ],
    points: [
      "Managed organizational finances after progressing from a communications-focused executive role.",
      "Designed social media content, banners and event materials; recruited and trained the media team.",
    ],
  },
  {
    id: "dabur",
    organization: "Dabur Bangladesh",
    location: "Dhaka, Bangladesh",
    roles: [{ role: "Campus Star", period: "May 2026 – Present" }],
    points: [
      "Selected as campus brand ambassador from 1,300+ applicants for Dabur Bangladesh's flagship program.",
      "Generated on-campus consumer insights and coordinated activities with the brand team.",
    ],
  },
  {
    id: "hult-prize",
    organization: "Hult Prize at IUB",
    location: "Dhaka, Bangladesh",
    roles: [{ role: "Head of Content Creation & Copywriting", period: "Feb 2025 – Dec 2025" }],
    points: [
      "Led content and copy strategy for campaign communications as part of the 2024–25 Organizing Committee.",
      "Collaborated across teams to keep messaging and branding consistent.",
    ],
  },
];
