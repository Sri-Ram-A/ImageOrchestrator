"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GlowEffect } from "@/components/motion-primitives/glow-effect";
import { TextMorph } from "@/components/motion-primitives/text-morph";
import { Upload, ImageIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { uploadPost } from "@/lib/gallery-api";
import type { Post } from "@/types";

type UploadDialogProps = {
  open: boolean;
  onClose: () => void;
  onUploaded: (post: Post) => void;
};

export function UploadDialog({ open, onClose, onUploaded }: UploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [processingType, setProcessingType] = useState<"none" | "grayscale" | "resize">("none");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setTitle("");
    setDescription("");
    setProcessingType("none");
    setFile(null);
    setPreview(null);
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    if (loading) return;
    resetForm();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    const url = URL.createObjectURL(selected);
    setPreview(url);
    if (!title) setTitle(selected.name.replace(/\.[^.]+$/, ""));
  }

  function handleDropZoneClick() {
    fileInputRef.current?.click();
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped || !dropped.type.startsWith("image/")) return;
    setFile(dropped);
    setPreview(URL.createObjectURL(dropped));
    if (!title) setTitle(dropped.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit() {
    if (!file || !title.trim()) {
      setError("Title and image are required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const post = await uploadPost({ title, description, image: file, processing_type: processingType });
      onUploaded(post);
      resetForm();
      onClose();
    } catch (err: unknown) {
      const e = err as Record<string, string>;
      setError(e.message ?? e.error ?? "Upload failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-stone-900 dark:text-stone-50">
            Upload Image
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Drop Zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleDropZoneClick}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onKeyDown={(e) => e.key === "Enter" && handleDropZoneClick()}
            className="relative group cursor-pointer rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 transition-colors overflow-hidden"
            style={{ minHeight: "140px" }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <AnimatePresence mode="wait">
              {preview ? (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative w-full h-40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Preview" className="w-full h-40 object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-2 p-8 text-stone-400 dark:text-stone-600 h-40"
                >
                  <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 group-hover:bg-stone-200 dark:group-hover:bg-stone-700 transition-colors">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                      Drop image here or click to browse
                    </p>
                    <p className="text-xs mt-0.5">Max 10MB · JPG, PNG, WebP</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-stone-500">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My photo"
              className="rounded-xl border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-stone-500">
              Description <span className="normal-case">(optional)</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell us about this image..."
              rows={2}
              className="rounded-xl border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 resize-none"
            />
          </div>

          {/* Processing type */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-stone-500">Processing</Label>
            <Select value={processingType} onValueChange={(v) => setProcessingType(v as typeof processingType)}>
              <SelectTrigger className="rounded-xl border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="grayscale">Grayscale</SelectItem>
                <SelectItem value="resize">Resize</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Submit with glow effect */}
          <div className="relative">
            <motion.div
              className="pointer-events-none absolute inset-0 rounded-xl"
              animate={{ opacity: loading ? 1 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <GlowEffect
                colors={["#0894FF", "#C959DD", "#FF2E54", "#FF9004"]}
                mode="colorShift"
                blur="medium"
                duration={4}
              />
            </motion.div>

            <button
              type="button"
              disabled={loading || !file}
              onClick={handleSubmit}
              className="relative w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-900 dark:bg-stone-50 text-white dark:text-stone-900 font-medium text-sm transition hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!loading && <Upload className="w-4 h-4" />}
              <TextMorph>{loading ? "Uploading..." : "Upload"}</TextMorph>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}