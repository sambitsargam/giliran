"use client";

import { useEffect, useState } from "react";
import { LANGS, useI18n } from "@/lib/i18n";
import { readJSON, writeJSON } from "@/lib/storage";

export function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Language</span>
      <select
        className="field !min-h-[44px] !w-auto !rounded-full !py-1 !pl-3 !pr-8 text-sm font-semibold appearance-none"
        value={lang}
        onChange={(e) => setLang(e.target.value as typeof lang)}
        aria-label="Language"
      >
        {LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.short} · {l.label}
          </option>
        ))}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-3 text-xs">▾</span>
    </label>
  );
}

type Theme = "light" | "dark" | "system";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage after mount
    setTheme(readJSON<Theme>("giliran.theme", "system"));
  }, []);
  const cycle = () => {
    const next: Theme = theme === "system" ? "dark" : theme === "dark" ? "light" : "system";
    setTheme(next);
    writeJSON("giliran.theme", next);
    if (next === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", next);
  };
  const label = theme === "system" ? "Theme: system" : theme === "dark" ? "Theme: dark" : "Theme: light";
  return (
    <button className="btn btn-ghost !h-11 !w-11 !p-0" onClick={cycle} aria-label={label} title={label}>
      {theme === "dark" ? "☾" : theme === "light" ? "☀" : "◐"}
    </button>
  );
}

/** Applied before hydration to avoid a flash of the wrong theme. */
export const themeScript = `try{var t=JSON.parse(localStorage.getItem('giliran.theme')||'"system"');if(t!=='system')document.documentElement.setAttribute('data-theme',t)}catch(e){}`;
