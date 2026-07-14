"use client";

import { useEffect, useState } from "react";
import { AI_MODELS, type AiModelId } from "@/lib/ai/models";

type Mode = "PROPOSE" | "AUTO_APPLY";

export function AiModeToggle() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [model, setModel] = useState<AiModelId | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setMode(data.settings.aiCommentMode);
        setModel(data.settings.aiModel);
      })
      .catch(() => {
        setMode("PROPOSE");
        setModel("claude-sonnet-5");
      });
  }, []);

  async function updateMode(next: Mode) {
    setMode(next);
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiCommentMode: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function updateModel(next: AiModelId) {
    setModel(next);
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiModel: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  if (!mode || !model) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
      <label className="flex items-center gap-2">
        <span>Model</span>
        <select
          value={model}
          disabled={saving}
          onChange={(event) => updateModel(event.target.value as AiModelId)}
          aria-label="AI model"
          className="app-input rounded-lg px-2 py-1 text-xs outline-none"
        >
          {AI_MODELS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label} — {option.description}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2">
        <span>Edits</span>
      <select
        value={mode}
        disabled={saving}
        onChange={(e) => updateMode(e.target.value as Mode)}
        aria-label="AI suggestion behavior"
        className="app-input rounded-lg px-2 py-1 text-xs outline-none"
      >
        <option value="PROPOSE">Propose for my approval</option>
        <option value="AUTO_APPLY">Apply automatically</option>
      </select>
      </label>
    </div>
  );
}
