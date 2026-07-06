"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { type DateRange } from "react-day-picker";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { GalleryGrid } from "@/components/gallery-grid";
import { GalleryHeader } from "@/components/gallery-header";
import { PostDrawer } from "@/components/post-drawer";
import { SearchBar } from "@/components/search-bar";
import { UploadDialog } from "@/components/upload-dialog";
import { DatePickerWithRange } from "@/components/date-picker-with-range";
import { Sparkles, AlertCircle, RefreshCw, Mail, ShieldQuestion } from "lucide-react";
import { GalleryFilter, type FilterMode } from "@/components/gallery-filter"; // Import here
import { REQUEST, API_URL } from "@/lib/api";
import { Post } from "@/types";

export default function GalleryPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [searchResults, setSearchResults] = useState<Post[]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
    const [filterMode, setFilterMode] = useState<FilterMode>("all");
    const [guidelinesOpen, setGuidelinesOpen] = useState(false);
    const [activeVideo, setActiveVideo] = useState<"gorilla" | "cat" | "dog">("gorilla");
    // 1. Initial Load of all images
    useEffect(() => {
        async function load() {
            try {
                const data = await REQUEST<Post[]>("GET", "/api/gallery/images/");
                setPosts(data);
            } catch {
                // Handle or log error
            } finally {
                setPageLoading(false);
            }
        }
        load();
    }, []);

    // 2. Client-Side Compute: Combine Search Baseline + Client Date Filtering
    const displayedPosts = useMemo(() => {
        let dataset = isSearchActive ? searchResults : posts;

        // 1. Apply Date Filtering stage if active
        if (dateRange?.from && dateRange?.to) {
            const startCompare = new Date(dateRange.from.setHours(0, 0, 0, 0)).getTime();
            const endCompare = new Date(dateRange.to.setHours(23, 59, 59, 999)).getTime();

            dataset = dataset.filter((post) => {
                if (!post.uploaded_at) return false;
                const postTime = new Date(post.uploaded_at).getTime();
                return postTime >= startCompare && postTime <= endCompare;
            });
        }

        // 2. Apply Custom Smart Filters
        if (filterMode === "blurry") {
            // Laplacian threshold < 100 highlights soft/out-of-focus targets
            return dataset.filter((post) => post.blur_score !== undefined && post.blur_score < 100);
        }

        if (filterMode === "duplicates") {
            // Build hash collision frequency map across your collection
            const hashCounts: Record<string, number> = {};
            dataset.forEach((p) => {
                if (p.phash) hashCounts[p.phash] = (hashCounts[p.phash] || 0) + 1;
            });
            // Keep items only if their exact phash fingerprint exists multiple times
            return dataset.filter((p) => p.phash && hashCounts[p.phash] > 1);
        }

        return dataset;
    }, [posts, searchResults, isSearchActive, dateRange, filterMode]);

    // 3. Network Search Handlers (only runs when text query runs)
    const handleSearch = useCallback(async function handleSearch(query: string) {
        setIsSearchActive(true);
        setSearchLoading(true);
        try {
            const results = await REQUEST<Post[]>("GET", `/api/gallery/search/?q=${encodeURIComponent(query)}`);
            setSearchResults(results);
        } catch {
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    const handleSearchClear = useCallback(function handleSearchClear() {
        setIsSearchActive(false);
        setSearchResults([]);
    }, []);

    const handleDateChange = (range: DateRange | undefined) => {
        setDateRange(range);
    };

    // Global Event Callbacks
    function handlePostClick(post: Post) {
        setSelectedPost(post);
        setDrawerOpen(true);
    }

    function handleDrawerClose() {
        setDrawerOpen(false);
        setTimeout(() => setSelectedPost(null), 300);
    }

    async function handleDelete(id: number) {
        await REQUEST<void>("DELETE", `/api/gallery/images/${id}/`);
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setSearchResults((prev) => prev.filter((p) => p.id !== id));
    }

    function handleUploaded(post: Post) {
        setPosts((prev) => [post, ...prev]);
    }

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans">
            <GalleryHeader onUpload={() => setUploadOpen(true)} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Search & Date Controls Bar */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4"
                >
                    <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <SearchBar
                            onSearch={handleSearch}
                            onClear={handleSearchClear}
                            loading={searchLoading}
                            isActive={isSearchActive}
                        />
                        <DatePickerWithRange onChange={handleDateChange} />
                        <GalleryFilter value={filterMode} onChange={setFilterMode} />
                    </div>

                    <AnimatePresence>
                        {(isSearchActive || dateRange?.from) && (
                            <motion.span
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -8 }}
                                className="text-sm text-stone-500 dark:text-stone-400 whitespace-nowrap"
                            >
                                {displayedPosts.length} result{displayedPosts.length !== 1 ? "s" : ""}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </motion.div>

                {/* Section header titles */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="mb-5 flex items-baseline justify-between"
                >
                    <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-50 tracking-tight">
                        {isSearchActive || dateRange?.from ? "Filtered Results" : "Your Gallery"}
                    </h2>
                    <Dialog open={guidelinesOpen} onOpenChange={setGuidelinesOpen}>
                        <DialogTrigger asChild>
                            <button
                                className="inline-flex items-center gap-2 rounded-full pl-2 pr-3.5 py-1 text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 group"
                                title="View System Guidelines"
                            >
                                <ShieldQuestion className="w-4 h-4 animate-pulse shrink-0 text-amber-500" />
                                <span className="group-hover:translate-x-0.5 transition-transform duration-150">
                                    System Guidelines
                                </span>
                            </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[540px] overflow-hidden border border-stone-200/80 dark:border-stone-800 bg-stone-50/95 dark:bg-stone-950/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6">
                            <DialogHeader className="space-y-1">
                                <DialogTitle className="text-xl font-semibold bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent flex items-center gap-2">
                                    System Processing Guidelines
                                </DialogTitle>
                                <DialogDescription className="text-stone-500 dark:text-stone-400 text-sm">
                                    Monitor background actions and connection health signals.
                                </DialogDescription>
                            </DialogHeader>

                            {/* Guidelines Stack */}
                            <div className="mt-5 space-y-3 text-sm">
                                {/* 1. Asynchronous processing delay notice */}
                                <div className="flex gap-3 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 text-stone-700 dark:text-stone-300">
                                    <RefreshCw className="w-5 h-5 text-amber-500 shrink-0 mt-0.5 " />
                                    <div>
                                        <p className="font-medium text-stone-900 dark:text-stone-100">AI Background Pipeline Processing</p>
                                        <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                                            Please wait <span className="font-semibold text-amber-600 dark:text-amber-400">10 to 20 seconds</span> then manually pull to refresh. AI models are preparing your custom descriptions, computational tags, and perceptive hashing datasets.
                                        </p>
                                    </div>
                                </div>

                                {/* 2. Target Base URL Network check */}
                                <div className="flex gap-3 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 text-stone-700 dark:text-stone-300">
                                    <AlertCircle className="w-5 h-5 text-stone-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-stone-900 dark:text-stone-100">Encountering a <span className="text-red-500 dark:text-red-400">NetworkError</span>?</p>
                                        <p className="mt-1 text-xs text-stone-600 dark:text-stone-400 leading-relaxed break-all">
                                            Verify that the database pipeline engine is live at:
                                            <code className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono text-[11px] text-amber-600 dark:text-amber-400">
                                                <a
                                                    href={API_URL || "#"}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 font-mono text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors duration-150 underline decoration-amber-500/30 underline-offset-2"
                                                >
                                                    Check Backend Connection URL →
                                                </a>
                                            </code>
                                        </p>
                                    </div>
                                </div>

                                {/* 3. Stream Interruption check */}
                                <div className="flex gap-3 p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/40 text-stone-700 dark:text-stone-300">
                                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-stone-900 dark:text-stone-100">Resource Fetch Failures</p>
                                        <p className="mt-0.5 text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                                            If asset loading fails, wait 5 seconds before retrying. For persistent service issues, escalate directly to the systems administrator.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Admin Banner Footer */}
<div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-stone-900 border border-stone-800">
    <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-[11px] font-medium text-stone-500 tracking-wider uppercase">
            <Mail className="w-3.5 h-3.5 text-amber-500" />
            <span>Systems Administrators</span>
        </div>
        <div className="text-stone-300 text-xs font-mono select-all flex flex-col gap-0.5 pl-5">
            <span>srirama.ai23@rvce.edu.in</span>
            <span>sreeharishtj.ai23@rvce.edu.in</span>
        </div>
    </div>
    
    <a 
        href="mailto:srirama.ai23@rvce.edu.in,sreeharishtj.ai23@rvce.edu.in?subject=Gallery%20Pipeline%20Network%20Error" 
        className="inline-flex items-center justify-center px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-500 text-stone-950 hover:bg-amber-400 transition-colors duration-150 shrink-0 text-center shadow-md shadow-amber-500/10"
    >
        Contact Admins via Mail
    </a>
</div>
                        </DialogContent>
                    </Dialog>
                    {!isSearchActive && !dateRange?.from && (
                        <span className="text-sm text-stone-400 dark:text-stone-600">
                            {posts.length} {posts.length === 1 ? "image" : "images"}
                        </span>
                    )}

                </motion.div>

                {/* Content Grid Display */}
                <AnimatePresence mode="wait">
                    {pageLoading ? (
                        <div className="grid grid-cols-3 md:grid-cols-4 auto-rows-[160px] gap-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="rounded bg-stone-100 dark:bg-stone-800 animate-pulse h-40" />
                            ))}
                        </div>
                    ) : (
                        <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <GalleryGrid posts={displayedPosts} onPostClick={handlePostClick} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <PostDrawer post={selectedPost} open={drawerOpen} onClose={handleDrawerClose} onDelete={handleDelete} />
            <UploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} onUploaded={handleUploaded} />
        </div>
    );
}