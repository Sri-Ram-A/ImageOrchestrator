"use client"

import { useEffect } from "react"
import { redirect } from "next/navigation"
import { Cloud, Shield, Zap, Container, Eye, ArrowRight, Lock, Cpu, Database } from "lucide-react"

export default function Home() {
  useEffect(() => {
    // Hide scrollbar
    document.body.style.overflow = "hidden"

    // Cleanup function to reset the overflow when the component unmounts
    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  const features = [
    {
      icon: <Cloud className="w-6 h-6" />,
      title: "Cloud Storage",
      description: "Secure cloud-based image storage",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Huffman Encoding",
      description: "Advanced compression algorithms",
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "PHash Security",
      description: "Perceptual hashing protection",
    },
    {
      icon: <Container className="w-6 h-6" />,
      title: "Docker Orchestration",
      description: "Scalable container management",
    },
  ]

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      <div className="absolute inset-0 z-0">
        <video autoPlay muted loop playsInline className="w-full h-full object-cover">
          <source src="https://cdn.pixabay.com/video/2025/03/29/268528_large.mp4" type="video/mp4" />
        </video>
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* div */}
            <div className="flex items-center bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30 transition-colors">
              <Cpu className="w-4 h-4 mr-2" />
              Advanced Image Processing Platform
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-6xl lg:text-7xl font-bold bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent leading-tight">
                Star Magics
              </h1>
              <p className="text-xl lg:text-2xl text-gray-300 leading-relaxed max-w-lg">
                Unlock the magic of secure, intelligent cloud image storage with cutting-edge compression and processing
                technology.
              </p>
            </div>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
                <Lock className="w-4 h-4 text-orange-400" />
                Enterprise Security
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
                <Database className="w-4 h-4 text-orange-400" />
                Smart Compression
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white">
                <Container className="w-4 h-4 text-orange-400" />
                Docker Powered
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center sm:flex-row gap-4">
              <button
                onClick={() => redirect("/upload")}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-2xl hover:shadow-orange-500/25 transition-all duration-300 transform hover:scale-105 group"
              >
                Start Creating
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => redirect("/view")}
                className="border-2 border-orange-500/50 text-white hover:bg-orange-500/20 hover:border-orange-400 font-semibold px-8 py-6 text-lg rounded-xl backdrop-blur-sm transition-all duration-300 group"
              >
                <Eye className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Explore Gallery
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">50%</div>
                <div className="text-sm text-gray-400">Compression</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-400">256-bit</div>
                <div className="text-sm text-gray-400">Encryption</div>
              </div>
            </div>
          </div>

          {/* Right Content - Feature Cards */}
          <div className="space-y-6">
            <div className="grid gap-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-xl group"
                >
                  <div className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/20 rounded-lg text-orange-400 group-hover:bg-orange-500/30 transition-colors">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold text-white text-lg">{feature.title}</h3>
                        <p className="text-gray-300 text-sm">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Technical Specs div */}
            <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-md border-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/20 transition-all duration-300">
              <div className="p-6">
                <h3 className="font-bold text-white text-xl mb-4 flex items-center gap-2">
                  <Zap className="w-6 h-6 text-orange-400" />
                  Enterprise Features
                </h3>
                <ul className="space-y-2 text-gray-300">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                    Multi-container orchestration
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                    Real-time image processing
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                    Advanced security protocols
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full" />
                    Scalable cloud infrastructure
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-red-500/20 rounded-full blur-xl animate-pulse delay-1000" />
      <div className="absolute top-1/2 right-20 w-16 h-16 bg-orange-400/20 rounded-full blur-xl animate-pulse delay-500" />
    </section>
  )
}