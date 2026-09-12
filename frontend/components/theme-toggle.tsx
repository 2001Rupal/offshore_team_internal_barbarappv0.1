'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTheme, Theme } from '../lib/theme-context';
import { Palette, Check, Sun, Moon, Sparkles, ChevronDown } from 'lucide-react';

export function ThemeToggle({ showLabel = true }: { showLabel?: boolean }) {
  const { theme, setTheme, availableThemes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (t: Theme) => {
    if (t === 'light') return <Sun className="h-3.5 w-3.5 text-amber-500" />;
    if (t === 'midnight') return <Sparkles className="h-3.5 w-3.5 text-emerald-400" />;
    return <Moon className="h-3.5 w-3.5 text-amber-400" />;
  };

  const currentThemeObj = availableThemes.find((t) => t.id === theme) || availableThemes[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-xl border border-zinc-700/60 bg-zinc-900/60 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800/80 focus:outline-none"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-1.5">
          {getThemeIcon(theme)}
          {showLabel && <span>{currentThemeObj.name}</span>}
        </div>
        <ChevronDown className="h-3 w-3 text-zinc-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-2xl border border-zinc-800 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/60">
            Appearance
          </div>
          <div className="mt-1 space-y-1">
            {availableThemes.map((item) => {
              const isSelected = theme === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTheme(item.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                    isSelected
                      ? 'bg-zinc-800/80 text-white font-medium'
                      : 'text-zinc-300 hover:bg-zinc-900 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 border border-white/20 shadow-sm"
                      style={{ backgroundColor: item.accentColor }}
                    />
                    <div>
                      <div className="leading-snug">{item.name}</div>
                      <div className="text-[10px] text-zinc-400 line-clamp-1">{item.description}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
