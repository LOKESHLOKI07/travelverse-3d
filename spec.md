# TravelVerse 3D

## Current State
Premium Mountain Explorers website with cinematic homepage, 3D India map (IndiaMap3D.tsx using React Three Fiber), trek detail pages, glassmorphism UI, and Montfort-inspired editorial layout.

## Requested Changes (Diff)

### Add
- `SnowTerrain3D.tsx`: A new immersive 3D snow terrain component using React Three Fiber
  - Uses the 4 uploaded snow AO texture maps as PBR textures on a 3D plane geometry with displacement
  - Features: animated snow particles, dynamic lighting, fog effects, auto-rotating camera
  - Appears as a full-width hero section on the homepage replacing or enhancing the current hero
- Snow texture cycling/carousel: user can click to see different snow textures applied to the terrain

### Modify
- `HomePage.tsx`: Add the SnowTerrain3D component as an immersive hero section at the top, with Mountain Explorers branding overlaid

### Remove
- Nothing removed

## Implementation Plan
1. Create `SnowTerrain3D.tsx` using @react-three/fiber and @react-three/drei
2. Build a displaced plane geometry (128x128 segments) with snow AO texture as aoMap
3. Add ambient + directional lighting with blue-tinted shadows for snowy atmosphere
4. Add animated snow particle system (500-1000 particles)
5. Add subtle fog and dark sky background
6. Overlay Mountain Explorers branding text using HTML overlay (not R3F HTML)
7. Wire into HomePage.tsx as hero section
