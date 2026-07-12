"use client";

import { useEffect, useState } from "react";

type Mode = "PROPOSE" | "AUTO_APPLY";

export function AiModeToggle() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => setMode(data.settings.aiCommentMode))
      .catch(() => setMode("PROPOSE"));
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

  if (!mode) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500">
      <span>When AI suggests an edit:</span>
      <select
        value={mode}
        disabled={saving}
        onChange={(e) => updateMode(e.target.value as Mode)}
        className="rounded-md border px-2 py-1 text-xs"
      >
        <option value="PROPOSE">Propose for my approval</option>
        <option value="AUTO_APPLY">Apply automatically</option>
      </select>
    </div>
  );
}
