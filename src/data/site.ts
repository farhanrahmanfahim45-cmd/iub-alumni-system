// Central place for site-wide identity, contact info and hero copy.
// Edit this file to update the name, positioning, taglines and social links
// used across the Navbar, Hero, Footer and Contact sections.

export const site = {
  name: "Farhan Rahman Fahim",
  identity: "Data Analytics & Business Intelligence",
  valueProposition:
    "I turn business data into insights, decisions, and actionable stories.",
  toolkit: ["SQL", "Python", "Power BI", "Excel"],
  location: "Dhaka, Bangladesh",
  email: "farhanrahmanfahim45@gmail.com",
  phone: "+8801534833998",
  linkedin: "https://www.linkedin.com/in/farhanrahmanfahim",
  github: "https://github.com/farhanrahmanfahim45-cmd",
  resumeUrl: "/resume/Farhan_Rahman_Fahim_Resume.pdf",
  profileImage: "/profile/farhan-headshot.webp",
  about:
    "I'm a Management Information Systems student who works at the intersection of business and technology. My focus is Data Analytics and Business Intelligence — using SQL, Python, Power BI and Excel to turn raw data into insights that support real decisions. Alongside analytics, I've built experience in business case competitions, organizational leadership and content strategy, which shapes how I approach problems: from both a business and an analytical angle.",
} as const;

export const navLinks = [
  { label: "Home", href: "#home" },
  { label: "Work", href: "#work" },
  { label: "About", href: "#about" },
  { label: "Experience", href: "#experience" },
  { label: "Contact", href: "#contact" },
] as const;

export const approachSteps = [
  {
    number: "01",
    title: "Business Problem",
    description: "Understand what the business actually needs to know or decide.",
  },
  {
    number: "02",
    title: "Data",
    description: "Collect, clean and structure the raw data behind the problem.",
  },
  {
    number: "03",
    title: "Analysis",
    description: "Apply SQL, Python and Excel to explore patterns and relationships.",
  },
  {
    number: "04",
    title: "Insight",
    description: "Translate analysis into clear, business-relevant findings.",
  },
  {
    number: "05",
    title: "Decision",
    description: "Present recommendations that support a real business decision.",
  },
] as const;
