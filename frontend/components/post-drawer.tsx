"use client";

import Image from "next/image";
import { format } from "date-fns";
import { Trash2, X, Tag, Clock, Layers } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
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
  if (!post) return null;

  function handleDelete() {
    if (!post) return;
    onDelete(post.id);
    onClose();
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[90vh] bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800">
        <div className="mx-auto w-full max-w-5xl p-4">

          {/* Top bar */}
          <DrawerHeader className="flex flex-row items-start justify-between px-0 pt-0 pb-4">
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

          {/* Main content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 md:grid-cols-2 gap-6 max-h-[calc(90vh-5rem)] overflow-y-auto pr-1">

            {/* Left: image */}
            <div className="space-y-4">
              <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-900">
                {post.image_url && (
                  <Image
                    src={post.image_url}
                    alt={post.title}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                )}
              </div>

              {post.description && (
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                  {post.description}
                </p>
              )}
            </div>

            {/* Right: meta */}
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

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs font-mono">
                  <Tag className="w-3 h-3 mr-1" />
                  id:{post.id}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs font-mono">
                  <Tag className="w-3 h-3 mr-1" />
                  phash:{post.phash}
                </Badge>
              </div>

              <div className="pt-4 border-t border-stone-100 dark:border-stone-800">
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full rounded-xl"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete image
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}