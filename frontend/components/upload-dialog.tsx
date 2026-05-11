"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Sparkles, Layers, ImageIcon, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
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
import type { Post } from "@/types";
import { Button } from "./ui/button";
import { REQUEST } from "@/lib/api"

export function UploadDialog({ open, onClose, onUploaded }: {
  open: boolean;
  onClose: () => void;
  onUploaded: (post: Post) => void;
}) {
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
      const payload = { title, description, image: file, processing_type: processingType };

      const formData = new FormData();
      formData.append("title", payload.title);
      formData.append("description", payload.description);
      formData.append("image", payload.image);
      formData.append("processing_type", payload.processing_type);
      const post = await REQUEST<Post>("POST", "/api/gallery/images/", formData, { isMultipart: true });

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
      <DialogContent className="max-w-md bg-white dark:bg-stone-950 border-stone-200 dark:border-stone-800">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-stone-900 dark:text-stone-50">
            Upload Image
          </DialogTitle>
          <DialogDescription>
            You can now Drag and Drop your Images
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="footer"></DialogFooter>

        <div className="space-y-4 mt-1">
          {/* Drop Zone */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleDropZoneClick}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onKeyDown={(e) => e.key === "Enter" && handleDropZoneClick()}
            className="relative group cursor-pointer rounded border-2 border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500 transition-colors overflow-hidden"
            style={{ minHeight: "140px" }}
          >
            <Input
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
                  <Button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null); }}
                    className="absolute top-2 right-2 bg-black/60 text-white  p-1 hover:bg-black/80"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center gap-2 p-8 text-stone-400 dark:text-stone-600 h-40"
                >
                  <div className="p-3 flex rounded-2xl space-x-4 bg-stone-100 dark:bg-stone-800 group-hover:bg-stone-200 dark:group-hover:bg-stone-700 transition-colors">
                    <Sparkles className="w-6 h-6" />
                    <ImageIcon className="w-6 h-6" />
                    <Layers className="w-6 h-6" />
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
              className="rounded border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900"
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
              className="rounded border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 resize-none"
            />
          </div>

          {/* Processing type */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-stone-500">Processing</Label>
            <Select value={processingType} onValueChange={(v) => setProcessingType(v as typeof processingType)}>
              <SelectTrigger className="rounded border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
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
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2">
              {error}
            </p>
          )}

          {/* Submit with animated glowing border */}
          <div className="relative w-full rounded-xl p-[1.5px] overflow-hidden">
            {/* Animated Border */}
            {loading && (
              <motion.div
                className="absolute inset-0 z-0"
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              >
                <div className="h-fullw-fullrounded-xlblur-sm"
                  style={{
                    background: `
            conic-gradient(
              from 0deg,
              #0894FF,
              #C959DD,
              #FF2E54,
              #FF9004,
              #0894FF
            )
          `,
                  }}
                />
              </motion.div>
            )}

            {/* Inner Button Container */}
            <div className="relative z-10 rounded-[10px] bg-stone-900 dark:bg-stone-50">
              <Button
                disabled={loading || !file}
                onClick={handleSubmit} className=" relative w-full flex items-center justify-center gap-2 rounded-[10px] bg-stone-900 dark:bg-stone-50 px-4 py-3 text-sm font-medium text-white dark:text-stone-900 transition hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 disabled:cursor-not-allowed   "
              >
                {!loading && <Upload className="w-4 h-4" />}
                <p>
                  {loading ? "Uploading..." : "Upload"}
                </p>
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}