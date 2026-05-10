"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, Loader2 } from "lucide-react";


export function SearchBar({ onSearch, onClear, loading, isActive }: {
  onSearch: (query: string) => void;
  onClear: () => void;
  loading: boolean;
  isActive: boolean;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      onClear();
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(query.trim());
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearch, onClear]);

  function handleClear() {
    setQuery("");
    onClear();
    inputRef.current?.focus();
  }

  return (
    <div className="relative w-full max-w-lg">
      <motion.div
        animate={{
          boxShadow: isActive
            ? "0 0 0 2px rgba(0,0,0,0.15)"
            : "0 0 0 1px rgba(0,0,0,0.08)",
        }}
        className="relative flex items-center rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 overflow-hidden"
      >
        <div className="pl-4 pr-2 shrink-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Loader2 className="w-4 h-4 text-stone-400 animate-spin" />
              </motion.div>
            ) : (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Search className="w-4 h-4 text-stone-400" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search images semantically…"
          className="flex-1 py-3 pr-3 bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-600 outline-none"
        />

        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              type="button"
              onClick={handleClear}
              className="mr-3 p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-stone-400" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {isActive && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full mt-1.5 left-0 text-xs text-stone-400 dark:text-stone-600 pl-1"
          >
            Powered by semantic vector search
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}