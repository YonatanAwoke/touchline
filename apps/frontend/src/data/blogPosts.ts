export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: "Touchline" | "Analytics" | "Coaching" | "Industry" | "Product";
  author: string;
  date: string; // ISO
  readMinutes: number;
  cover: string; // image url
  body: string[]; // paragraphs
}

const stockCovers = [
  "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=1200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1487466365202-1afdb86c764e?w=1200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=70&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200&q=70&auto=format&fit=crop",
];

export const blogPosts: BlogPost[] = [
  {
    slug: "touchline-launches-the-digital-touchline",
    title: "Touchline Launches: The Digital Touchline for Modern Football",
    excerpt:
      "Today we're opening early access to Touchline — the AI-powered platform built to help clubs of any size manage teams, analyse matches, and grow players.",
    category: "Touchline",
    author: "Touchline Team",
    date: "2026-04-22",
    readMinutes: 4,
    cover: stockCovers[0],
    body: [
      "Football is changing fast. Data, video and AI are no longer reserved for elite clubs — they're becoming a baseline expectation for every coach who wants to make better decisions on the pitch.",
      "Touchline is our answer: a single platform where clubs, coaches and organisations can register players, plan training, analyse matches, and track development over time.",
      "Early access opens today. We're partnering with a small group of clubs across grassroots, academy and semi-pro levels to refine the experience before our public launch.",
      "If you'd like to be one of the first to step onto the digital touchline, request access and we'll be in touch within 24 hours.",
    ],
  },
  {
    slug: "what-coaches-actually-want-from-analytics",
    title: "What Coaches Actually Want From Football Analytics",
    excerpt:
      "We interviewed 40 coaches across five countries. The takeaway: dashboards aren't enough. Here's what actually changes their decisions on Saturday.",
    category: "Analytics",
    author: "Maria Costa",
    date: "2026-04-10",
    readMinutes: 6,
    cover: stockCovers[1],
    body: [
      "Most analytics tools start with metrics. Coaches start with questions: Who's tired? Who's improving? What did our press break down on?",
      "When we mapped these questions to data, only a fraction of common dashboards actually answered them. The rest were vanity numbers.",
      "Touchline's metric philosophy is simple — every chart should answer a coach question. If it doesn't, it shouldn't be on the screen.",
    ],
  },
  {
    slug: "video-tagging-without-the-grind",
    title: "Video Tagging Without the Grind",
    excerpt:
      "How auto-tagging and computer vision can cut a coach's match-review time from 4 hours to 25 minutes — without losing nuance.",
    category: "Product",
    author: "Liam Ndlovu",
    date: "2026-03-28",
    readMinutes: 5,
    cover: stockCovers[2],
    body: [
      "Manual video tagging is the silent tax of modern coaching. Touchline's smart tagging detects events automatically and lets you refine them in seconds.",
      "The result: more time on the training pitch, less time scrubbing footage at midnight.",
    ],
  },
  {
    slug: "managing-a-club-as-a-volunteer-coach",
    title: "Managing a Grassroots Club as a Volunteer Coach",
    excerpt:
      "Spreadsheets, WhatsApp groups and a lot of goodwill. We built Touchline so volunteer coaches can run their clubs without burning out.",
    category: "Coaching",
    author: "Sofie Lindgren",
    date: "2026-03-15",
    readMinutes: 4,
    cover: stockCovers[3],
    body: [
      "Volunteer coaches are the backbone of football. They also juggle three jobs to keep the club running.",
      "Touchline's club workspace replaces five tools with one — registrations, schedules, sessions and communication, all in one place.",
    ],
  },
  {
    slug: "the-rise-of-ai-in-football-management",
    title: "The Rise of AI in Football Management",
    excerpt:
      "From injury prediction to opposition scouting, AI is quietly reshaping how clubs are run. Here's what's real today and what's still hype.",
    category: "Industry",
    author: "Daniel Park",
    date: "2026-02-20",
    readMinutes: 7,
    cover: stockCovers[4],
    body: [
      "AI in football is no longer a buzzword — it's a workflow. Models that estimate fatigue, suggest line-ups, or surface scouting candidates are now in production at top clubs.",
      "But not every claim holds up. We break down what's working, what's snake oil, and where Touchline draws the line.",
    ],
  },
  {
    slug: "five-metrics-every-academy-should-track",
    title: "Five Metrics Every Academy Should Track",
    excerpt:
      "Player development isn't just goals and assists. These five metrics tell a deeper story about progression — and they're built into Touchline.",
    category: "Analytics",
    author: "Maria Costa",
    date: "2026-02-05",
    readMinutes: 5,
    cover: stockCovers[5],
    body: [
      "Goals are easy to count. Growth is harder. We outline five trackable indicators — from sprint distance to decision speed — that paint a fuller picture of an academy player's trajectory.",
    ],
  },
];

export const blogCategories = ["All", "Touchline", "Analytics", "Coaching", "Industry", "Product"] as const;
