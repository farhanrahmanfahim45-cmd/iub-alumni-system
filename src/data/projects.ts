// ---------------------------------------------------------------------------
// PROJECT DATA
// ---------------------------------------------------------------------------
// This is the single source of truth for every project shown on the site.
// The UI (ProjectCard, ProjectDetail, etc.) reads from this file and
// automatically hides any field/link that isn't provided — so adding a new
// project or updating an existing one never requires touching a component.
//
// TO ADD A NEW PROJECT:
//   1. Drop optimized images into public/projects/<slug>/
//   2. Add a new object to the `projects` array below
//   3. Fill in `caseStudy` sections (any section can be omitted)
//   4. Only set `links.*` fields that actually exist — unavailable links
//      are hidden automatically, never shown as disabled/empty buttons.
// ---------------------------------------------------------------------------

export type FilterTag = "SQL" | "Python" | "Power BI" | "Excel" | "Web App";

export interface ProjectLinks {
  github?: string;
  live?: string;
  dashboard?: string;
  report?: string;
  download?: string;
}

export interface GalleryImage {
  src: string;
  caption: string;
}

export interface Metric {
  value: string;
  label: string;
}

export interface CaseStudySection {
  id: string;
  heading: string;
  body?: string[];
  bullets?: string[];
  note?: string; // small caveat / evidence note, rendered subtly
}

// Optional demo-login block, shown on the project page when present.
export interface DemoAccess {
  heading: string;
  intro: string;
  rows: { role: string; signIn: string }[];
  password: string;
  note?: string;
}

export interface Project {
  id: string;
  slug: string;
  number: string;
  role: string; // e.g. "Flagship Project"
  depthLabel: string; // e.g. "Full Case Study"
  depthStars: number; // 1-5
  title: string;
  shortTitle: string;
  cardDescription: string;
  tools: string[];
  filterTags: FilterTag[];
  featuredMetric?: Metric;
  metrics?: Metric[];
  coverImage: string;
  gallery: GalleryImage[];
  caseStudy: CaseStudySection[];
  links: ProjectLinks;
  // Short banner shown above the case study, e.g. "Prototype - no real data".
  disclaimer?: string;
  demoAccess?: DemoAccess;
}

export const projects: Project[] = [
  // -------------------------------------------------------------------
  // 01 — GRAMEENPHONE — FLAGSHIP PROJECT
  // -------------------------------------------------------------------
  {
    id: "grameenphone",
    slug: "grameenphone",
    number: "01",
    role: "Flagship Project",
    depthLabel: "Full Case Study",
    depthStars: 5,
    title: "Sales Performance Analytics & Business Decision-Making — Grameenphone Ltd.",
    shortTitle: "Grameenphone",
    cardDescription:
      "An end-to-end analytics project on telecom sales data — from raw transactions to an executive Power BI decision-support system.",
    tools: ["SQL", "Python", "Excel", "Power BI"],
    filterTags: ["SQL", "Python", "Excel", "Power BI"],
    featuredMetric: { value: "49,959", label: "Cleaned Transactions" },
    metrics: [
      { value: "৳14.11M", label: "Total Revenue" },
      { value: "৳6.06M", label: "Total Profit" },
      { value: "14.47K", label: "Unique Customers" },
      { value: "42.93%", label: "Profit Margin" },
    ],
    coverImage: "/projects/grameenphone/dashboard-executive-overview.webp",
    gallery: [
      {
        src: "/projects/grameenphone/dashboard-executive-overview.webp",
        caption:
          "Executive Overview — revenue, profit, transactions and channel performance at a glance.",
      },
      {
        src: "/projects/grameenphone/dashboard-customer-behavior.webp",
        caption:
          "Customer Behavior & Segmentation — data usage, satisfaction and demographic patterns.",
      },
      {
        src: "/projects/grameenphone/dashboard-packages-profitability.webp",
        caption:
          "Popular Packages & Profitability — top packages by revenue, profit and campaign performance.",
      },
    ],
    caseStudy: [
      {
        id: "overview",
        heading: "Overview",
        body: [
          "This project analyzes sales, customer and package-level data for a simulated Grameenphone sales operation, moving from raw transactional records to a three-page executive Power BI decision-support system covering revenue performance, customer behavior and product profitability.",
        ],
      },
      {
        id: "business-problem",
        heading: "Business Problem",
        body: [
          "Telecom sales data is high-volume and multi-dimensional — spanning product categories, sales channels, customer segments and divisions. The objective was to consolidate this data into a single view that lets decision-makers answer: which segments, channels and packages actually drive revenue and profit, and where is performance declining?",
        ],
      },
      {
        id: "dataset",
        heading: "Dataset",
        body: [
          "The dataset covers transactional sales records across product categories (Internet, Combo, Postpaid, Voice, Recharge and Digital Service packages), sales channels (Retail Store, MyGP App, Recharge Shop, Authorized Dealer), customer segments (Young Professional, Family, Business, Student) and divisions, over a defined date range.",
        ],
        bullets: [
          "49,959 cleaned transaction records",
          "14.47K unique customers",
          "6 service categories, 4 customer segments, 4 sales channels",
        ],
      },
      {
        id: "data-preparation",
        heading: "Data Preparation",
        body: [
          "Raw transactional data was cleaned and structured before analysis — validating customer and transaction identifiers, standardizing category and channel labels, and handling missing/'Unknown' customer type values so they wouldn't distort segment-level conclusions.",
        ],
      },
      {
        id: "sql-python-excel",
        heading: "SQL, Python & Excel Analysis",
        body: [
          "SQL was used to query and validate the underlying transaction data, Python for exploratory data analysis and pattern checks, and Excel to build supporting summaries ahead of dashboard design. The Power BI dashboards below are the primary delivered output of this stage.",
        ],
        note: "Detailed query/notebook files for this project are not currently published — the dashboards represent the analysis output.",
      },
      {
        id: "power-bi-dashboard",
        heading: "Power BI Dashboard",
        body: [
          "The dashboard is split into three focused pages: an Executive Overview for revenue and channel KPIs, a Customer Behavior & Segmentation page for usage and satisfaction patterns, and a Popular Packages & Profitability page for product-level performance — each fully filterable by date, product category, customer segment, division, sales channel and customer type.",
        ],
      },
      {
        id: "key-insights",
        heading: "Key Insights",
        bullets: [
          "Internet Package and Combo Package together generate roughly two-thirds of total revenue (40.31% and 27.49% respectively).",
          "Monthly revenue trended downward across the observed period, from a peak of ~820K to ~729K — a signal worth flagging to leadership.",
          "Retail Store and MyGP App are the two leading sales channels, ahead of Recharge Shop and Authorized Dealer.",
          "Business and Premium customer segments show the highest average data usage (15GB and 13GB), while average customer satisfaction sits at a moderate 3.66 on the dashboard's scale — an area with room to improve.",
          "The 20GB Monthly, 20GB+600Min and 10GB+400Min packages are consistently the top revenue and profit generators.",
          "Regular and Ramadan campaigns each contributed roughly 34% of campaign-driven revenue, notably ahead of the Eid and Digital Growth campaigns.",
        ],
      },
      {
        id: "recommendations",
        heading: "Business Recommendations",
        bullets: [
          "Prioritize retention and upsell offers around Internet and Combo packages, the clear revenue anchors.",
          "Investigate the cause of the declining monthly revenue trend before it compounds further.",
          "Double down on the Retail Store and MyGP App channels, and evaluate whether underperforming channels need repositioning or retirement.",
          "Design targeted campaigns for high-usage, moderate-satisfaction segments (Business, Premium) to protect high-value customers.",
        ],
      },
    ],
    links: {},
  },

  // -------------------------------------------------------------------
  // 02 — BIKE SALES ANALYSIS — TECHNICAL / DATA ANALYSIS PROJECT
  // -------------------------------------------------------------------
  {
    id: "bike",
    slug: "bike-sales",
    number: "02",
    role: "Technical / Data Analysis Project",
    depthLabel: "Technical Deep-Dive",
    depthStars: 3,
    title: "Bike Store Sales & Customer Lifetime Value Analysis",
    shortTitle: "Bike Sales Analysis",
    cardDescription:
      "A SQL-driven analysis of a relational bike store database, exploring customer lifetime value and sales patterns across a normalized schema.",
    tools: ["SQL", "MySQL", "Database Design"],
    filterTags: ["SQL"],
    featuredMetric: { value: "9", label: "Related Tables Modeled" },
    metrics: [
      { value: "65.66%", label: "Revenue from Top CLV Tier" },
      { value: "463", label: "High-Value Customers ($6000+)" },
    ],
    coverImage: "/projects/bike/sql-query-clv.webp",
    gallery: [
      {
        src: "/projects/bike/er-diagram.webp",
        caption:
          "Relational schema — customers, orders, order items, products, stocks, stores, staff, brands and categories.",
      },
      {
        src: "/projects/bike/sql-query-clv.webp",
        caption:
          "SQL query computing customer lifetime value (CLV), order count and average order value per customer.",
      },
      {
        src: "/projects/bike/clv-tier-distribution.webp",
        caption:
          "Customer Lifetime Value distribution across five spending tiers.",
      },
    ],
    caseStudy: [
      {
        id: "overview",
        heading: "Overview",
        body: [
          "A structured SQL analysis of a multi-store bike retailer's relational database — covering customers, orders, order items, products, stock, stores, staff, brands and categories — built to answer customer-value and sales-performance questions directly from the schema.",
        ],
      },
      {
        id: "problem",
        heading: "Analytical Problem",
        body: [
          "With sales data spread across nine related tables, the goal was to identify which customers actually drive revenue, and how concentrated that value is — a foundational question for any retention or loyalty strategy.",
        ],
      },
      {
        id: "data",
        heading: "Data",
        body: [
          "The schema models a realistic retail structure: customers place orders containing order items tied to products, products belong to brands and categories, and stock/staff/store tables track fulfillment across multiple locations.",
        ],
      },
      {
        id: "approach",
        heading: "Approach",
        body: [
          "Working directly in MySQL Workbench, queries were built to calculate historical spend, order counts and average order value per customer, then group customers into lifetime-value tiers to see how revenue concentration looked in practice.",
        ],
      },
      {
        id: "analysis",
        heading: "Analysis",
        body: [
          "The core query joins customers to their orders and order items, computes each customer's lifetime value as quantity × list price × (1 − discount) summed across orders, and ranks customers from highest to lowest spend.",
        ],
      },
      {
        id: "findings",
        heading: "Key Findings",
        bullets: [
          "The top CLV tier ($6,000+), just 463 customers, accounts for 65.66% of total revenue.",
          "The next tier ($3,000–$5,999), 392 customers, contributes a further 22.79% — together the top two tiers drive nearly 89% of revenue.",
          "Customers spending under $500 (70 customers) contribute only 0.32% of total revenue — a clear long tail.",
          "This concentration highlights a classic Pareto pattern: a small share of customers is responsible for the large majority of lifetime value.",
        ],
      },
    ],
    links: {
      github: "https://github.com/farhanrahmanfahim45-cmd",
    },
  },

  // -------------------------------------------------------------------
  // 03 — KFC BANGLADESH — BUSINESS INTELLIGENCE / DASHBOARD SHOWCASE
  // -------------------------------------------------------------------
  {
    id: "kfc",
    slug: "kfc",
    number: "03",
    role: "Business Intelligence / Dashboard Showcase",
    depthLabel: "Dashboard Showcase",
    depthStars: 3,
    title: "KFC Bangladesh Sales Analytics Dashboard",
    shortTitle: "KFC Sales Analytics",
    cardDescription:
      "A three-page Power BI dashboard turning KFC Bangladesh's multi-branch sales data into visual, decision-ready business intelligence.",
    tools: ["Power BI", "Data Visualization", "Business Intelligence"],
    filterTags: ["Power BI"],
    featuredMetric: { value: "৳108.77M", label: "Net Sales" },
    metrics: [
      { value: "৳43.50M", label: "Total Actual Profit" },
      { value: "74.76%", label: "of Target Sales Achieved" },
      { value: "17+", label: "Branches Tracked" },
    ],
    coverImage: "/projects/kfc/dashboard-overview.webp",
    gallery: [
      {
        src: "/projects/kfc/dashboard-overview.webp",
        caption:
          "Sales Overview — net sales, profit, payment methods and customer type breakdown.",
      },
      {
        src: "/projects/kfc/dashboard-growth-analysis.webp",
        caption:
          "Growth Analysis — monthly net sales trend, order growth and profit by month & city.",
      },
      {
        src: "/projects/kfc/dashboard-geographical-analysis.webp",
        caption:
          "Geographical Analysis — sales by branch, division and city across Bangladesh.",
      },
    ],
    caseStudy: [
      {
        id: "overview",
        heading: "Overview",
        body: [
          "A three-page Power BI dashboard built on KFC Bangladesh's multi-branch sales data, giving a business-ready view of overall performance, growth trends and geographic distribution across divisions and branches.",
        ],
      },
      {
        id: "objective",
        heading: "Business Objective",
        body: [
          "Turn raw sales and operations data into a visual tool that lets stakeholders quickly see how sales are tracking against target, which channels and customer types drive revenue, and where performance varies by branch and region.",
        ],
      },
      {
        id: "dashboard",
        heading: "Dashboard",
        body: [
          "The Overview page surfaces core KPIs — net sales, cost, discount and profit — alongside product category, payment method and customer type breakdowns. Growth Analysis tracks net sales and order volume by month, and profit by month and city. Geographical Analysis maps sales and order volume across branches, divisions and cities.",
        ],
      },
      {
        id: "kpis",
        heading: "Key KPIs",
        bullets: [
          "Net Sales: ৳108.77M against a ৳160M target (74.76% achieved)",
          "Total Actual Profit: ৳43.50M",
          "Total Discount: ৳11.23M",
          "Cash remains the leading payment method (40.31%), ahead of Card (30.02%) and Online (29.67%)",
        ],
      },
      {
        id: "insights",
        heading: "Key Insights",
        bullets: [
          "Dine-in is the leading customer type at 50.29% of net sales, ahead of Takeaway (29.86%) and Delivery (19.86%).",
          "Chicken is the dominant product category by net sales, well ahead of Burger, Combo and Drinks.",
          "Fried Chicken, Chicken Bucket and Hot Wings are the top individual products by net sales.",
          "Dhaka Division accounts for the majority of orders (57.18%), with Chattogram Division a distant second (17.89%).",
          "KFC Banani, Gulshan and Dhanmondi are consistently among the highest-performing branches by net sales.",
        ],
      },
    ],
    links: {},
  },

  // -------------------------------------------------------------------
  // 04 — HABITO — LIVE WEB APPLICATION
  // -------------------------------------------------------------------
  {
    id: "habito",
    slug: "habito",
    number: "04",
    role: "Live Web Application",
    depthLabel: "Product Case Study",
    depthStars: 4,
    title: "Habito — Space Discovery & Listing Platform for Bangladesh",
    shortTitle: "Habito",
    cardDescription:
      "A bilingual web platform for discovering, listing and managing rentable and sellable spaces across Bangladesh — built from a real audit of how people search today.",
    tools: ["React", "TypeScript", "Supabase", "Tailwind CSS"],
    filterTags: ["Web App"],
    featuredMetric: { value: "109", label: "Rental Posts Audited" },
    metrics: [
      { value: "109", label: "Rental Posts Audited" },
      { value: "62", label: "Dhaka Facebook To-Let Groups" },
      { value: "65", label: "Usability Survey Responses" },
      { value: "2", label: "Languages (English / বাংলা)" },
    ],
    coverImage: "/projects/habito/habito-preview.webp",
    gallery: [
      {
        src: "/projects/habito/habito-preview.webp",
        caption:
          "Habito — find the space that fits. Click the project link above to open the live prototype.",
      },
    ],
    disclaimer:
      "Prototype demo: listings are synthetic seed data and payments run through a clearly labelled sandbox.",
    caseStudy: [
      {
        id: "overview",
        heading: "Overview",
        body: [
          "Habito is a web platform for discovering, listing and managing available spaces across Bangladesh — rooms, sublets, shops, offices, godowns, parking, storage and land — in one searchable place instead of scattered social-media posts.",
        ],
      },
      {
        id: "problem",
        heading: "The Problem",
        body: [
          "Space hunting in Bangladesh largely happens through Facebook to-let groups and word of mouth. Posts are unstructured, hard to compare, quickly buried and difficult to verify. Owners have no simple way to list, update and manage what they have available.",
        ],
      },
      {
        id: "research",
        heading: "Evidence Base",
        body: [
          "The product was shaped by research rather than assumption: an audit of existing posts to see what information is typically missing, and a bilingual usability survey to test whether real people could complete renter and owner tasks.",
        ],
        bullets: [
          "Audit of 109 rental posts across 62 Dhaka Facebook to-let groups",
          "Bilingual usability survey with 65 responses, of which 36 completed a renter or owner task",
        ],
      },
      {
        id: "features",
        heading: "What It Does",
        bullets: [
          "Search and browse spaces across multiple categories — rooms, sublets, shops, offices, godowns, parking and land",
          "Owners can list and manage their own spaces",
          "Map-based discovery using Leaflet and OpenStreetMap",
          "Fully bilingual interface in English and বাংলা",
          "Row-level security on the database so users can only change what belongs to them",
        ],
      },
      {
        id: "stack",
        heading: "Tech Stack",
        body: [
          "React 18, TypeScript, Vite and Tailwind CSS v4 on the front end; Supabase (Postgres with row-level security) on the back end; Leaflet with OpenStreetMap for maps; deployed on Vercel.",
        ],
      },
      {
        id: "status",
        heading: "Current Status & Limits",
        body: [
          "Habito is a working prototype, and its limits are stated openly rather than hidden.",
        ],
        bullets: [
          "Demo listings are synthetic seed data, not real properties",
          "Payments run through a clearly labelled sandbox — no real money moves",
          "No NID / eKYC verification and no registered legal entity yet",
        ],
      },
    ],
    links: {
      live: "https://habito-live.vercel.app/",
    },
  },

  // -------------------------------------------------------------------
  // 05 — IUB ALUMNI INFORMATION SYSTEM — PROTOTYPE DATABASE
  // -------------------------------------------------------------------
  {
    id: "iub-alumni",
    slug: "iub-alumni-database",
    number: "05",
    role: "Prototype Database System",
    depthLabel: "Live Prototype",
    depthStars: 3,
    title: "Alumni Information System — Department of International Business, IUB",
    shortTitle: "IUB Alumni Database",
    cardDescription:
      "A prototype alumni database for IUB's Department of International Business with admin, faculty and alumni sign-ins. Demo only — no real data.",
    tools: ["Database Design", "Role-Based Access", "Web App"],
    filterTags: ["Web App"],
    featuredMetric: { value: "3", label: "User Roles" },
    metrics: [
      { value: "3", label: "User Roles" },
      { value: "100%", label: "Demo Data — Nothing Real" },
    ],
    coverImage: "/projects/iub-alumni/alumni-signin-preview.webp",
    gallery: [
      {
        src: "/projects/iub-alumni/alumni-signin-preview.webp",
        caption:
          "Sign-in screen — Administrator, Faculty and Alumni each get their own access. Use the project link above to try the live prototype.",
      },
    ],
    disclaimer:
      "This is a prototype database. No data in it is real — every record, name and account is made up for demonstration.",
    demoAccess: {
      heading: "Try the demo",
      intro:
        "Sign in at the live prototype using any of the demo accounts below to see how each role experiences the system.",
      rows: [
        { role: "Administrator", signIn: "admin@iub.edu.bd" },
        { role: "Faculty", signIn: "faculty@iub.edu.bd" },
        { role: "Alumni", signIn: "2000001" },
      ],
      password: "IUBDemo2026!",
      note: "All three accounts use the same password. These are demo credentials for a prototype with fictional data.",
    },
    caseStudy: [
      {
        id: "overview",
        heading: "Overview",
        body: [
          "The Alumni Information System is a prototype built for the Department of International Business at Independent University, Bangladesh (IUB). It explores how a department could keep alumni records in one structured place and give each type of user the access that fits their role.",
        ],
      },
      {
        id: "prototype-notice",
        heading: "Prototype Notice",
        body: [
          "This is a prototype database. All data in it is fictional — no real alumni, faculty or administrator information is stored or shown.",
        ],
      },
      {
        id: "roles",
        heading: "Role-Based Access",
        body: [
          "The system has three separate kinds of sign-in, so each type of user enters through their own account.",
        ],
        bullets: [
          "Administrator — signs in with an administrator email",
          "Faculty — signs in with a faculty email",
          "Alumni — signs in with an alumni ID number",
        ],
      },
    ],
    links: {
      live: "https://iubinbalumnidbs.netlify.app/",
    },
  },
];

export function getProjectBySlug(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}
