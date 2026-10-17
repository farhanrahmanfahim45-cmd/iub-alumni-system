// Capabilities are grouped by what they enable, not by subjective
// proficiency percentages (per PRD section 15).

export interface CapabilityGroup {
  id: string;
  title: string;
  description: string;
  skills: string[];
}

export const capabilities: CapabilityGroup[] = [
  {
    id: "data-analysis",
    title: "Data Analysis",
    description: "Querying, cleaning and exploring data to find what matters.",
    skills: ["SQL", "Python", "Excel", "Exploratory Data Analysis"],
  },
  {
    id: "business-intelligence",
    title: "Business Intelligence",
    description: "Turning raw numbers into dashboards people can act on.",
    skills: ["Power BI", "KPI Reporting", "Data Visualization"],
  },
  {
    id: "business-analysis",
    title: "Business Analysis",
    description: "Connecting analytical findings back to business decisions.",
    skills: ["Problem Solving", "Business Case Analysis", "Decision Support"],
  },
  {
    id: "communication",
    title: "Communication & Leadership",
    description: "Presenting findings clearly and coordinating teams.",
    skills: ["Content Strategy", "Team Coordination", "Stakeholder Communication"],
  },
];
