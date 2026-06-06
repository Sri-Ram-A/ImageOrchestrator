"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { type DateRange } from "react-day-picker";
import { isWithinInterval, parseISO, startOfDay, endOfDay } from "date-fns"; // Helpful for clean date checks

import { GalleryGrid } from "@/components/gallery-grid";
import { GalleryHeader } from "@/components/gallery-header";
import { PostDrawer } from "@/components/post-drawer";
import { SearchBar } from "@/components/search-bar";
import { UploadDialog } from "@/components/upload-dialog";
import { DatePickerWithRange } from "@/components/date-picker-with-range";
import { GalleryFilter, type FilterMode } from "@/components/gallery-filter"; // Import here
import { REQUEST } from "@/lib/api";
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