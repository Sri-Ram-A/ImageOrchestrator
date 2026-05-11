"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { Sun, Moon, LogOut, Plus, User } from "lucide-react";
import { motion } from "motion/react";
import { clearTokens, REQUEST } from "@/lib/api";
import { SlidingNumber } from '@/components/motion-primitives/sliding-number';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import type { UserProfile } from "@/types";

export function GalleryHeader({
    onUpload,
}: {
    onUpload: () => void;
}) {
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [time, setTime] = useState(new Date());
    const [me, setMe] = useState<UserProfile | null>(null);
    const [profileOpen, setProfileOpen] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState<string | null>(null);

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    function handleLogout() {
        clearTokens();
        router.push("/");
    }

    function toggleTheme() {
        setTheme(theme === "dark" ? "light" : "dark");
    }

    async function loadProfile() {
        setProfileLoading(true);
        setProfileError(null);

        try {
            const data = await REQUEST<UserProfile>("GET", "/api/auth/me/");
            setMe(data);
        } catch {
            setProfileError("Could not load profile.");
        } finally {
            setProfileLoading(false);
        }
    }

    function handleUserClick() {
        setProfileOpen(true);
        if (!me) {
            void loadProfile();
        }
    }

    return (
        <>
            <header className="sticky top-0 z-40 border-b border-stone-100 bg-white/80 backdrop-blur-md dark:border-stone-900 dark:bg-stone-950/80">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
                    <motion.div
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex shrink-0 gap-2"
                    >
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-900 dark:bg-stone-50">
                            <div className="h-3 w-3 rounded-sm bg-white dark:bg-stone-900" />
                        </div>
                        <span className="font-display text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50">
                            Illuminate
                        </span>

                        <div className='bg-secondary p-1 rounded flex items-center gap-0.5 font-mono'>
                            <SlidingNumber value={time.getHours()} padStart={true} />
                            <span className='text-zinc-500'>:</span>
                            <SlidingNumber value={time.getMinutes()} padStart={true} />
                            <span className='text-zinc-500'>:</span>
                            <SlidingNumber value={time.getSeconds()} padStart={true} />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleUserClick}
                            className="rounded-xl text-stone-500 hover:text-stone-900 dark:hover:text-stone-50"
                        >
                            <User className="h-4 w-4" />
                        </Button>

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
                            <LogOut className="h-4 w-4" />
                        </Button>

                        <Button
                            onClick={onUpload}
                            size="sm"
                            className="gap-1.5 rounded-xl bg-stone-900 font-medium text-white hover:bg-stone-800 dark:bg-stone-50 dark:text-stone-900 dark:hover:bg-stone-200"
                        >
                            <Plus className="h-4 w-4" />
                            Upload
                        </Button>
                    </motion.div>
                </div>
            </header>

            <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
                <DialogContent className="sm:max-w-md m-2 py-6">
                    <DialogHeader>
                        <DialogTitle>Profile</DialogTitle>
                        <DialogDescription>Your account details.</DialogDescription>
                    </DialogHeader>

                    {profileLoading && (
                        <div className="text-sm text-muted-foreground">Loading profile...</div>
                    )}

                    {profileError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
                            {profileError}
                        </div>
                    )}

                    {me && !profileLoading && (
                        <div className="space-y-3 text-sm">
                            <div className="rounded-xl border bg-muted/40 p-4">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Username
                                </div>
                                <div className="mt-1 font-medium">{me.username}</div>
                            </div>

                            <div className="rounded-xl border bg-muted/40 p-4">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Email
                                </div>
                                <div className="mt-1 font-medium">{me.email}</div>
                            </div>

                            <div className="rounded-xl border bg-muted/40 p-4">
                                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                                    Joined
                                </div>
                                <div className="mt-1 font-medium">
                                    {new Date(me.date_joined).toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}