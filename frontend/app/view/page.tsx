"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { getImages } from "@/services"
import HeroSection from "@/components/HeroSection"
import Modal from "@/components/Modal"
import { User, Calendar, Hash, Zap, Eye } from "lucide-react"
import { ImageData } from "@/types"


export default function View() {
    const [images, setImages] = useState<ImageData[]>([])
    const [selectedImage, setSelectedImage] = useState<ImageData | null>(null)
    const [hoveredImage, setHoveredImage] = useState<number | null>(null)
    const [failedImages, setFailedImages] = useState<number[]>([]);
    // the above line is added only to show the images stored in media/ folder or minio
    // Django sends entire Data since though images are stored in folders,their meta data is stored in db.sqlite3
    useEffect(() => {
        const fetchImages = async () => {
            const data = await getImages()
            console.log(data)
            setImages(data)
        }
        fetchImages()
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-black">
            {/* Animated Background Elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-500" />
            </div>

            {/* Grid Pattern Overlay */}
            <div
                className="fixed inset-0 opacity-20 pointer-events-none"
                style={{
                    backgroundImage: `
                        linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: "50px 50px",
                }}
            />

            {selectedImage && (
                <Modal
                    {...selectedImage}
                    onClose={() => setSelectedImage(null)}
                />
            )}

            <div className="relative z-10">
                <HeroSection />

                <div className="flex items-center justify-center text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-full px-6 py-3 mb-6">
                        <Zap className="w-5 h-5 text-blue-400" />
                        <div className="border-blue-500/30 text-blue-300">
                            {images.length} Images Indexed
                        </div>
                        <div className="border-purple-500/30 text-purple-300">
                            PHash Secured
                        </div>
                    </div>
                </div>

                {/* Gallery */}
                <div className="container mx-auto px-6 py-12">
                    <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-6 space-y-6">
                        {images
                            .filter((image) => !failedImages.includes(image.id))
                            .map((image) => (
                                <div
                                    key={image.id}
                                    className="break-inside-avoid mb-6 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-blue-500/50 transition-all duration-500 group cursor-pointer overflow-hidden"
                                    onMouseEnter={() => setHoveredImage(image.id)}
                                    onMouseLeave={() => setHoveredImage(null)}
                                    onClick={() => setSelectedImage(image)}
                                >
                                    <div className="relative">
                                        <Image
                                            src={image.image_url || "/placeholder.svg"}
                                            alt={image.title}
                                            width={0}
                                            height={0}
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="w-full h-auto transition-transform duration-700 group-hover:scale-110"
                                            loading="lazy"
                                            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R+Rj5m1P9oj/9k="
                                            placeholder="blur"
                                            onError={() => setFailedImages((prev) => [...prev, image.id])}

                                        />

                                        {/* Hover Overlay */}
                                        {hoveredImage === image.id && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent">
                                                <div className="absolute bottom-4 left-4 right-4">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Eye className="w-4 h-4 text-blue-400" />
                                                        <span className="text-blue-300 text-sm">View Details</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="absolute top-3 left-3 flex items-center gap-2">
                                            {/* Creator badge */}
                                            <div className="flex items-center gap-1 bg-slate-900/80 backdrop-blur-md rounded-full px-3 py-1.5 border border-blue-500/30">
                                                <User className="w-3 h-3 text-blue-400" />
                                                <span className="text-blue-300 text-xs font-medium">Creator {image.creator}</span>
                                            </div>

                                            {/* Processing type badge */}
                                            <span
                                                className={`
                                                     text-white text-xs font-semibold px-2 py-1 rounded 
                                                     ${image.processing_type === "grayscale"
                                                        ? "bg-gray-500"
                                                        : image.processing_type === "resolution"
                                                            ? "bg-cyan-500"
                                                            : "bg-green-600"}
    `}
                                            >
                                                {image.processing_type}
                                            </span>
                                        </div>



                                        <div className="absolute top-3 right-3">
                                            <div className="bg-purple-500/20 backdrop-blur-md rounded-full p-2 border border-purple-500/30">
                                                <Hash className="w-3 h-3 text-purple-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        <div>
                                            <h3 className="font-semibold text-white text-lg mb-1 group-hover:text-blue-300 transition-colors">
                                                {image.title}
                                            </h3>
                                            <p className="text-slate-400 text-sm line-clamp-2">{image.description}</p>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                            <div className="flex items-center gap-2 text-slate-400 text-xs">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(image.uploaded_at).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                                <span className="text-green-400 text-xs">Secured</span>
                                            </div>
                                        </div>

                                        <div className="bg-slate-900/50 rounded-lg p-2 border border-slate-700/30">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Hash className="w-3 h-3 text-purple-400" />
                                                <span className="text-purple-300 text-xs font-medium">PHash</span>
                                            </div>
                                            <code className="text-slate-400 text-xs font-mono break-all">
                                                {image.phash}...
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {images.length === 0 && (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center gap-3 bg-slate-800/50 backdrop-blur-sm rounded-full px-6 py-3 border border-slate-700/50">
                                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                <span className="text-slate-300">Initializing Image Network...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}