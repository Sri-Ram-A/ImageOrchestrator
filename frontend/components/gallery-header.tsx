"use client";

import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Sun, Moon, LogOut, Plus } from "lucide-react";
import { motion } from "motion/react";
import { clearTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function GalleryHeader({ onUpload }: { onUpload: () => void; }) {
    const { theme, setTheme } = useTheme();
    const router = useRouter();

    function handleLogout() {
        clearTokens();
        router.push("/");
    }

    function toggleTheme() {
        setTheme(theme === "dark" ? "light" : "dark");
    }

    return (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-100 dark:border-stone-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                {/* Brand */}
                <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 shrink-0"
                >
                    <div className="w-7 h-7 rounded-lg bg-stone-900 dark:bg-stone-50 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-sm bg-white dark:bg-stone-900" />
                    </div>
                    <span className="font-display text-lg font-semibold text-stone-900 dark:text-stone-50 tracking-tight">
                        Lumina
                    </span>
                </motion.div>

                {/* Actions */}
                <motion.div
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-50"
                    >
                        <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-50"
                    >
                        <LogOut className="w-4 h-4" />
                    </Button>

                    <Button
                        onClick={onUpload}
                        size="sm"
                        className="rounded-xl bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-stone-200 gap-1.5 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Upload
                    </Button>
                </motion.div>
            </div>
        </header>
    );
}