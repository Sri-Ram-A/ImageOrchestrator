"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Image from "next/image";
import type { Post } from "@/types";
import { Badge } from "@/components/ui/badge";



const GRID_SPANS = [
  "col-span-1 row-span-2",
  "col-span-2 row-span-1",
  "col-span-1 row-span-1",
  "col-span-1 row-span-2",
  "col-span-1 row-span-1",
  "col-span-2 row-span-2",
  "col-span-1 row-span-1",
  "col-span-1 row-span-1",
];

function getSpanClass(index: number): string {
  return GRID_SPANS[index % GRID_SPANS.length];
}

function GalleryCard({ post, index, onClick }: { post: Post; index: number; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const spanClass = getSpanClass(index);
  const parsedTags =
    typeof post.tags === "string"
      ? post.tags
        .replace(/[\[\]']/g, "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      : [];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative cursor-pointer overflow-hidden rounded bg-stone-100 dark:bg-stone-800 ${spanClass}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{ minHeight: "160px" }}
    >
      {post.image_url && (
        <Image
          src={post.image_url}
          alt={post.title}
          fill
          className="object-cover transition-transform duration-500"
          style={{ transform: hovered ? "scale(1.06)" : "scale(1)" }}
          sizes="(max-width: 768px) 50vw, 33vw"
          loading="eager"
        />
      )}

      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        animate={{ opacity: hovered ? 1 : 0.4 }}
        transition={{ duration: 0.3 }}
      />

      <motion.div
        className="absolute bottom-0 left-0 right-0 p-3"
        animate={{ y: hovered ? 0 : 8, opacity: hovered ? 1 : 0.7 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-sm font-semibold text-white truncate">{post.title}</p>
        {post.description && (
          <p className="text-xs text-white/70 truncate mt-0.5">{post.description}</p>
        )}
        {
          parsedTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {parsedTags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className=" rounded-full px-2.5 py-0.5 text-[11px] font-medium bg-green-900 dark:bg-amber-800 text-white/80 border border-white/10 backdrop-blur-sm hover:bg-white/20   "
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
      </motion.div>
    </motion.div>
  );
}

export function GalleryGrid({ posts, onPostClick }: {
  posts: Post[];
  onPostClick: (post: Post) => void;
}) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-stone-400 dark:text-stone-600">
        <p className="font-display text-xl">No images yet</p>
        <p className="text-sm mt-1">Upload your first image to get started</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 auto-rows-[160px] gap-3">
      <AnimatePresence>
        {posts.map((post, index) => (
          <GalleryCard
            key={post.id}
            post={post}
            index={index}
            onClick={() => onPostClick(post)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}