# Mountain Explorers - Montfort-Inspired Redesign

## Current State
Premium cinematic Mountain Explorers site with glassmorphism panels, floating particles, 3D India map, hero section, featured treks, testimonials, booking preview, and Friendship Peak detail page.

## Requested Changes (Diff)

### Add
- Full-screen hero with large split-line typography like Montfort ("Mountain" / "Explorers" stacked bold)
- "Scroll down to discover" animated prompt at bottom of hero
- Numbered section blocks (01, 02, 03...) for each major content section
- Clean top navigation bar with links on the right side (no hamburger on desktop)
- India destinations showcase replacing a section (similar to Montfort's global offices grid)
- Clean editorial section layout with large section numbers and serif headings
- Sticky side navigation dots or section indicators

### Modify
- Overall layout: switch from card-grid heavy layout to clean editorial sectioned scrolling
- Navigation: minimal top bar, logo left, links right, ultra-clean
- Typography: larger, bolder display headings; tight tracking; mix of serif + sans
- Color palette: deep black/dark grey base, white text, with Mountain Explorers signature cyan/orange accents (not overloaded)
- Hero: massive full-screen typography instead of current centered-card approach
- Trek cards: keep but redesign with cleaner lines, numbered, less glassmorphism clutter
- Spacing: premium generous whitespace like Montfort

### Remove
- Excessive floating particles/elements that clutter the reading experience
- Multiple competing glow effects
- Busy background noise textures

## Implementation Plan
1. Redesign HomePage.tsx with Montfort-inspired layout: full-screen hero with stacked bold typography, scroll prompt, clean numbered sections
2. Redesign navigation: slim top bar, logo left, navigation links right
3. Redesign trek section with numbered editorial cards
4. Add India destinations grid section (pin locations as clean grid)
5. Keep TrekDetailPage.tsx largely intact, update nav style
6. Clean up index.css: simplify particle/glow effects, improve typography scale
