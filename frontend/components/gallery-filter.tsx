// @/components/gallery-filter.tsx
"use client"

import { SlidersHorizontal } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export type FilterMode = "all" | "duplicates" | "blurry"

interface GalleryFilterProps {
    value: FilterMode
    onChange: (value: FilterMode) => void
}

export function GalleryFilter({ value, onChange }: GalleryFilterProps) {
    return (
        <div className="flex items-center gap-2">
            <Select value={value} onValueChange={(v) => onChange(v as FilterMode)}>
                <SelectTrigger className="w-[180px] bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800">
                    <SlidersHorizontal className="w-4 h-4 mr-2 text-stone-500" />
                    <SelectValue placeholder="Filter images" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Images</SelectItem>
                    <SelectItem value="duplicates">Show Duplicates</SelectItem>
                    <SelectItem value="blurry">Show Blurry ({"<"}100)</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}