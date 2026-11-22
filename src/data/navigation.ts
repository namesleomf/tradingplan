export const groups = [
  ["Mindset & Rules", "mindset", ["Psychology", "Rules"]],
  ["Goals", "goals", ["Goals"]],
  [
    "Trading Session",
    "trading-session",
    [
      "Workflow Setup",
      "Trading Days & Time Frames",
      "Trading Pairs",
      "Trading Window",
      "News",
      "Before a Trade",
      "Today's Plan",
    ],
  ],
  [
    "Market Framework",
    "market-framework",
    [
      "Methodology",
      "Indicators",
      "Chart Analysis",
      "Strategy",
      "Market Condition",
    ],
  ],
  [
    "Setup & Entry",
    "setup-entry",
    [
      "Validate POI",
      "Trading Model",
      "Entry Model",
      "Entry Confluence",
      "Entry Trigger",
    ],
  ],
  [
    "Risk Management",
    "risk-management",
    ["Risk Settings", "Risk Personal", "Risk (Futures)", "Lockouts"],
  ],
  ["Review", "review", ["Losing Day?"]],
] as const;
export function slug(title: string) {
  return title
    .toLowerCase()
    .replace(/['()?]/g, "")
    .replace(/ & /g, "-")
    .replaceAll(" ", "-");
}
export const pages = groups.flatMap(([group, path, names]) =>
  names.map((title) => ({
    group,
    path,
    title,
    id: slug(title),
    url: "/" + path + "/" + slug(title),
  })),
);
export const today = "/trading-session/todays-plan";
export const steps = [
  "workflow-setup",
  "before-a-trade",
  "chart-analysis",
  "validate-poi",
  "trading-model",
  "entry-model",
  "entry-confluence",
  "entry-trigger",
  "risk-settings",
];
export const entryModels = ["Type 1", "Type 2(a)", "Type 2(b)", "Type 3"];
