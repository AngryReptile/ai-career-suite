"use client";

/**
 * LiquidGlassEffects Component
 * 
 * Provides a global SVG filter library for high-fidelity glass refraction.
 * Includes:
 * 1. #liquid-refraction: Uses a displacement map to warp background content.
 * 2. #liquid-specular: Creates sharp, pinpoint glossy highlights (specular glints).
 * 3. #liquid-grain: Adds a very subtle micro-texture to surfaces.
 */
export function LiquidGlassEffects() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }} aria-hidden="true">
      <defs>
        {/*
          Optical Refraction Filter
          Warps the background to simulate the "liquid" bending of light.
        */}
        <filter id="liquid-refraction" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.015 0.015" 
            numOctaves="3" 
            seed="42" 
            result="noise" 
          />
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="noise" 
            scale="20" 
            xChannelSelector="R" 
            yChannelSelector="G" 
            result="warped" 
          />
          <feComposite in="warped" in2="SourceGraphic" operator="in" />
        </filter>

        {/*
          Specular Lighting Filter
          Creates pinpoint "glints" of light that react to surface normals.
        */}
        <filter id="liquid-specular" x="-20%" y="-20%" width="140%" height="140%">
           <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="4" result="noise" />
           <feSpecularLighting 
             surfaceScale="10" 
             specularConstant="1.5" 
             specularExponent="60" 
             lightingColor="#ffffff" 
             in="noise" 
             result="specular"
           >
             <fePointLight x="100" y="-50" z="300" />
           </feSpecularLighting>
           <feComposite in="specular" in2="SourceGraphic" operator="in" />
        </filter>

        {/* Micro-Grain Filter for premium texture */}
        <filter id="liquid-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.03" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
