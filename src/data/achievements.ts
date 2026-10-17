// Recognition (PRD section 19-20). Only verifiable achievements are
// included. Golden Snitch and IUB E-Business Club are explicitly excluded
// per PRD section 19.2.
//
// Note on BAYLA: source materials show two distinct results — a Champion
// title at the Intra-IUB round, and a Finalist result at the national
// BAYLA Future Leaders Summit. Both are kept as separate, accurately
// labeled entries rather than merged into one claim.

export interface Achievement {
  id: string;
  title: string;
  organization: string;
  description?: string;
  proofImage?: string; // path to image/thumbnail, omit if no proof asset
  proofType?: "image" | "pdf";
}

export const achievements: Achievement[] = [
  {
    id: "bayla-intra-champion",
    title: "Champion",
    organization: "BAYLA Future Leaders Business Case Competition 2026 — Intra-IUB Round",
    description: "Won the Intra-IUB round of the national BAYLA Future Leaders business case competition.",
    proofImage: "/achievements/bayla-intra-champion.webp",
    proofType: "image",
  },
  {
    id: "bayla-summit-finalist",
    title: "Finalist",
    organization: "BAYLA Future Leaders Summit 2026 (National)",
    description: "Advanced to the national final of the BAYLA Future Leaders Summit after winning the Intra-IUB round.",
    proofImage: "/achievements/bayla-summit-finalist-1.webp",
    proofType: "image",
  },
  {
    id: "excellence-excel",
    title: "Champion",
    organization: "Excellence 1.0 — Intra-University Microsoft Excel Competition",
    description: "First place in an intra-university Excel-based competition organized by the Independent Accounting Association.",
    proofImage: "/achievements/excellence-excel-champion.webp",
    proofType: "image",
  },
  {
    id: "shomvob",
    title: "3rd Best Performer",
    organization: "Shomvob — Campus to Career Campaign",
    description: "Recognized as a top finalist and 3rd best performer in Shomvob's Campus to Career campaign.",
    proofImage: "/achievements/shomvob-campus-to-career.webp",
    proofType: "image",
  },
  {
    id: "deans-list",
    title: "Dean's List",
    organization: "Independent University, Bangladesh — Autumn 2023",
    description: "Recognized for academic performance in the Autumn 2023 semester.",
  },
];
