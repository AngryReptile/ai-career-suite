"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export function AnimatedBackground() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="fixed inset-0 z-[-50] overflow-hidden bg-[#020205] pointer-events-none">
        <motion.div
          className="absolute top-[-20%] left-[-20%] w-[100%] h-[100%] rounded-full bg-[#0a1025] blur-[150px]"
          animate={{ x: ["0%", "20%", "-10%", "0%"], y: ["0%", "30%", "10%", "0%"], scale: [1, 1.2, 0.9, 1] }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-20%] right-[-20%] w-[90%] h-[90%] rounded-full bg-[#150a25] blur-[140px]"
          animate={{ x: ["0%", "-25%", "15%", "0%"], y: ["0%", "-20%", "30%", "0%"], scale: [1, 0.8, 1.1, 1] }}
          transition={{ duration: 35, repeat: Infinity, ease: "easeInOut" }}
        />

      {/* Layer 2: Refined Fluid Lines (SVG Paths) */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.15]" xmlns="http://www.w3.org/2000/svg">
        <motion.path
          d="M-100,500 C150,300 350,700 600,450 S850,200 1100,500"
          stroke="rgba(100, 150, 255, 0.4)"
          strokeWidth="1"
          fill="none"
          strokeDasharray="1 5"
          animate={{ d: ["M-100,500 C150,300 350,700 600,450 S850,200 1100,500", "M-100,520 C170,320 370,720 620,470 S870,220 1120,520", "M-100,500 C150,300 350,700 600,450 S850,200 1100,500"] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>

      {/* Layer 3: Synaptic Particles (Client-Only) */}
      {mounted && [...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-blue-300/15 blur-[1px]"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            left: `${(i * 13) % 100}%`,
            top: `${(i * 19) % 100}%`,
          }}
          animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.3, 1], y: ["-30px", "30px", "-30px"] }}
          transition={{ duration: 10 + (i % 5), repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
        />
      ))}

      {/* Layer 4: Procedural Noise */}
      <div 
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay" 
        style={{ 
          backgroundImage: "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noiseFilter\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.75\" numOctaves=\"4\" stitchTiles=\"stitch\"/%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noiseFilter)\"/%3E%3C/svg%3E')" 
        }}
      />
      
      {/* Subtle Anchor Glow */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-950/20 to-transparent" />
      
      {/* Heavy Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
    </div>
  );
}
