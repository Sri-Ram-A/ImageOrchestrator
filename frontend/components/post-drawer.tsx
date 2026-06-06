"use client";

import { useState } from "react"; // Added useState for modal state
import Image from "next/image";
import { format } from "date-fns";
import { Trash2, X, Tag, Clock, Layers, Maximize2 } from "lucide-react"; // Imported Maximize2 icon
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"; // Imported Shadcn Dialog primitives
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Post } from "@/types";

function MetaRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 border-b border-stone-100 dark:border-stone-800 last:border-0">
      <div className="mt-0.5 p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800">
        <Icon className="w-3.5 h-3.5 text-stone-500 dark:text-stone-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-stone-700 dark:text-stone-300 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}

export function PostDrawer({ post, open, onClose, onDelete }: {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  onDelete: (id: number) => void;
}) {
  const [isMaximized, setIsMaximized] = useState(false); // Modal display tracking state

  if (!post) return null;

  function handleDelete() {
    if (!post) return;
    onDelete(post.id);
    onClose();
  }

  const parsedTags =
    typeof post.tags === "string"
      ? post.tags
        .replace(/[\[\]']/g, "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
      : [];

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="h-[90vh] md:h-auto max-h-[90vh] bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 flex flex-col">
        <div className="mx-auto w-full max-w-5xl p-4 flex flex-col flex-1 min-h-0">

          {/* Top bar */}
          <DrawerHeader className="flex flex-row items-start justify-between px-0 pt-0 pb-4 shrink-0">
            <div>
              <DrawerTitle className="font-display text-2xl text-stone-900 dark:text-stone-50">
                {post.title}
              </DrawerTitle>
              <DrawerDescription className="text-sm text-stone-500 mt-1">
                View image details and metadata.
              </DrawerDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 -mt-1 text-stone-400 hover:text-stone-900 dark:hover:text-stone-50"
            >
              <X className="w-4 h-4" />
            </Button>
          </DrawerHeader>

          {/* Main content body */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Left: image with Maximize Modal Integration */}
              <div className="space-y-4">
                <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900 ring-1 ring-stone-900/5 dark:ring-white/5 shadow-sm group">
                    {post.image_url && (
                      <>
                        <Image
                          src={post.image_url}
                          alt={post.title}
                          fill
                          className="object-contain transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                          priority
                        />

                        {/* Hover Maximize Action Overlay button */}
                        <DialogTrigger asChild>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute top-3 right-3 h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm shadow-md border border-stone-200/50 dark:border-stone-800/50"
                          >
                            <Maximize2 className="w-4 h-4 text-stone-700 dark:text-stone-300" />
                          </Button>
                        </DialogTrigger>
                      </>
                    )}
                  </div>

                  {/* High-fidelity full viewport modal context */}
                  <DialogContent className=" !max-w-none w-[75vw] h-[75vh] p-0 bg-black border-0 " >
                    <DialogTitle className="sr-only">Maximize {post.title}</DialogTitle>
                    {post.image_url && (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <Image
                          src={post.image_url}
                          alt={post.title}
                          fill
                          className="object-contain select-none"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 80vw"
                          quality={100}
                          priority
                        />
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                {/* Description Panel */}
                {(post.description || post.detailed_description) && (
                  <div className="space-y-3 px-0.5">
                    {post.description && (
                      <p className="text-sm text-stone-800 dark:text-stone-200 font-medium leading-relaxed tracking-tight">
                        {post.description}
                      </p>
                    )}

                    {post.detailed_description && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed font-normal border-l-2 border-stone-200 dark:border-stone-800 pl-3">
                        {post.detailed_description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Right: meta data panel */}
              <div className="space-y-4">
                <div className="rounded-xl border border-stone-100 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
                  <MetaRow
                    icon={Clock}
                    label="Uploaded"
                    value={format(new Date(post.uploaded_at), "MMM d, yyyy · h:mm a")}
                  />
                  <MetaRow
                    icon={Layers}
                    label="Processing"
                    value={post.processing_type.charAt(0).toUpperCase() + post.processing_type.slice(1)}
                  />
                </div>

                {parsedTags.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-stone-400 dark:text-stone-500 uppercase tracking-wider font-medium">
                      AI Scene Tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsedTags.map((tag, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-500/10 dark:bg-amber-500/10 text-green-700 dark:text-amber-400 border border-green-500/20 dark:border-amber-500/20"
                        >
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="secondary" className="text-xs font-mono">
                    <Tag className="w-3 h-3 mr-1" />
                    id:{post.id}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-mono">
                    <Tag className="w-3 h-3 mr-1" />
                    phash:{post.phash}
                  </Badge>
                </div>
              </div>

            </div>
          </div>

          {/* Sticky Bottom Actions Area */}
          <div className="pt-3 pb-2 border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-950 shrink-0">
            <Button
              variant="destructive"
              size="sm"
              className="w-full rounded-xl py-5 text-sm font-medium"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete image
            </Button>
          </div>

        </div>
      </DrawerContent>
    </Drawer>
  );
}