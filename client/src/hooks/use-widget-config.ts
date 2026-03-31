import { useState, useCallback } from "react";

export const WIDGET_DEFS = [
  {
    id: "quick-actions",
    label: "Quick Actions",
    description: "New Quote & Schedule Job buttons",
    defaultOn: true,
  },
  {
    id: "quick-quote",
    label: "Quick Quote",
    description: "Fire off a draft quote in seconds",
    defaultOn: true,
  },
  {
    id: "stats",
    label: "Stats Strip",
    description: "Quotes out, jobs this week, unpaid invoices",
    defaultOn: true,
  },
  {
    id: "follow-ups",
    label: "Follow-up Alerts",
    description: "Quotes that need chasing",
    defaultOn: true,
  },
  {
    id: "today-schedule",
    label: "Today's Schedule",
    description: "Remaining jobs scheduled for today",
    defaultOn: true,
  },
  {
    id: "recent-quotes",
    label: "Recent Quotes",
    description: "Your last 3 quotes at a glance",
    defaultOn: false,
  },
] as const;

export type WidgetId = (typeof WIDGET_DEFS)[number]["id"];

const STORAGE_KEY = "vargen_widget_config_v1";

function loadConfig(): Record<WidgetId, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return Object.fromEntries(WIDGET_DEFS.map((w) => [w.id, w.defaultOn])) as Record<WidgetId, boolean>;
}

function saveConfig(config: Record<WidgetId, boolean>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function useWidgetConfig() {
  const [config, setConfig] = useState<Record<WidgetId, boolean>>(loadConfig);

  const toggle = useCallback((id: WidgetId) => {
    setConfig((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveConfig(next);
      return next;
    });
  }, []);

  const isOn = useCallback((id: WidgetId) => config[id] ?? true, [config]);

  return { config, toggle, isOn };
}
