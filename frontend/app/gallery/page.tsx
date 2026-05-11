"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GalleryGrid } from "@/components/gallery-grid";
import { GalleryHeader } from "@/components/gallery-header";
import { PostDrawer } from "@/components/post-drawer";
import { SearchBar } from "@/components/search-bar";
import { UploadDialog } from "@/components/upload-dialog";
import { REQUEST } from "@/lib/api"
import { Post } from "@/types";

export default function GalleryPage() {
    const [posts, setPosts] = useState<Post[]>([]);
    const [displayedPosts, setDisplayedPosts] = useState<Post[]>([]);
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [uploadOpen, setUploadOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);

    useEffect(
        () => {
            async function load() {
                try {
                    const data = await REQUEST<Post[]>("GET", "/api/gallery/images/");;
                    setPosts(data);
                    setDisplayedPosts(data);
                } catch {
                    // Silently fail — user may need to reauthenticate
                } finally {
                    setPageLoading(false);
                }
            }
            load();
        }, []);

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
        const updated = posts.filter((p) => p.id !== id);
        setPosts(updated);
        setDisplayedPosts(isSearchActive ? displayedPosts.filter((p) => p.id !== id) : updated);
    }

    function handleUploaded(post: Post) {
        const updated = [post, ...posts];
        setPosts(updated);
        if (!isSearchActive) setDisplayedPosts(updated);
    }

    const handleSearch = useCallback(async function handleSearch(query: string) {
        setIsSearchActive(true);
        setSearchLoading(true);
        try {
            const results = await REQUEST<Post[]>("GET", `/api/gallery/search/?q=${encodeURIComponent(query)}`);;
            setDisplayedPosts(results);
        } catch {
            setDisplayedPosts([]);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    const handleSearchClear = useCallback(function handleSearchClear() {
        setIsSearchActive(false);
        setDisplayedPosts(posts);
    }, [posts]);

    return (
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 font-sans">
            <GalleryHeader onUpload={() => setUploadOpen(true)} />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                {/* Search Row */}
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                    <SearchBar
                        onSearch={handleSearch}
                        onClear={handleSearchClear}
                        loading={searchLoading}
                        isActive={isSearchActive}
                    />

                    <AnimatePresence>
                        {isSearchActive && (
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

                {/* Section heading */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="mb-5 flex items-baseline justify-between"
                >
                    <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-50 tracking-tight">
                        {isSearchActive ? "Search results" : "Your Gallery"}
                    </h2>
                    {!isSearchActive && (
                        <span className="text-sm text-stone-400 dark:text-stone-600">
                            {posts.length} {posts.length === 1 ? "image" : "images"}
                        </span>
                    )}
                </motion.div>

                {/* Display Images + Skeleton Loading */}
                <AnimatePresence mode="wait">
                    {pageLoading ? (
                        <motion.div
                            key="skeleton"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="grid grid-cols-3 md:grid-cols-4 auto-rows-[160px] gap-3"
                        >
                            {Array.from({ length: 8 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse"
                                    style={{ gridColumn: i === 1 || i === 5 ? "span 2" : "span 1", gridRow: i === 0 || i === 3 ? "span 2" : "span 1" }}
                                />
                            ))}
                        </motion.div>
                    ) : (
                        <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <GalleryGrid posts={displayedPosts} onPostClick={handlePostClick} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <PostDrawer
                post={selectedPost}
                open={drawerOpen}
                onClose={handleDrawerClose}
                onDelete={handleDelete}
            />

            <UploadDialog
                open={uploadOpen}
                onClose={() => setUploadOpen(false)}
                onUploaded={handleUploaded}
            />
        </div>
    );
}