# PlayPort marketing kit

**PlayPort — All-in-one self-hosting platform**  
**Play your way**  
Hosting together. On your terms.

Open `index.html` for a visual gallery and downloadable originals. All artwork is editable, self-contained SVG. The logo files have **no background**, including inside the controller and server bays. Campaign graphics deliberately have dark backgrounds.

## Assets

| File | Size | Use |
| --- | --- | --- |
| logo-transparent.svg | 320 × 192 | Full-color transparent mark |
| logo-white.svg | 320 × 192 | Transparent white mark for dark surfaces |
| logo-black.svg | 320 × 192 | Transparent dark mark for light surfaces |
| wordmark-transparent.svg | 960 × 192 | Horizontal logo and name |
| favicon.svg | 320 × 320 | Transparent browser-tab icon |
| avatar-512.svg | 512 × 512 | Community/profile avatar |
| social-square-1080.svg | 1080 × 1080 | Square social post |
| social-portrait-1080x1350.svg | 1080 × 1350 | Portrait feed post |
| story-1080x1920.svg | 1080 × 1920 | Story/reel cover |
| social-card-1200x630.svg | 1200 × 630 | Link preview / social card |
| profile-cover-1500x500.svg | 1500 × 500 | Profile header |
| video-thumbnail-1280x720.svg | 1280 × 720 | Video thumbnail |
| poster-a4.svg | 794 × 1123 | A4-proportioned digital poster |
| copy.md | — | Website, launch, social, email, ad and video copy |
| brand-guide.md | — | Palette, typography, tone and logo rules |
| launch-plan.md | — | Launch checklist and campaign schedule |

## Publishing

- Open `index.html` and use **Download PNG** to export at the original dimensions. Logo PNGs preserve transparency. Editable SVG masters are also available; most social platforms require PNG/JPEG.
- For web link previews, export the 1200 × 630 card to PNG/JPEG and use an absolute public URL in your site's `og:image` metadata.
- Replace `[PRODUCT_URL]`, `[CONTACT_EMAIL]`, and any bracketed campaign fields in copy before publication. No live destination or release date has been invented.
- Preview platform crops before posting. Keep headline and controller visible; move the lower CTA if the platform overlays controls.
- The A4 poster has no bleed or CMYK conversion. A print shop should set these up for commercial printing.
- Confirm availability and feature claims against the actual release. The kit makes no uptime, performance, pricing or customer-count promises.

## Regeneration

From `playport/`, run `node brandgen.js` to rebuild SVGs and synchronize the app logo and browser favicon. This leaves the hand-written marketing guide, copy and gallery unchanged. No packages or external fonts are needed.
