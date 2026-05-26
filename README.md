# Simple Photo Editor Website by Kim.

[TRY IT] (https://kimrebamba.github.io/photo-editor-website/)

A tiny, ad-free, no-login photo editor that runs entirely in your browser.

This is a static HTML/CSS/JS site that loads an image into a `<canvas>`, applies a few “good enough” adjustments (tone, color, grain, vignette, skin soften), lets you compare before/after, and exports a PNG.

## Why?

I wanted a quick editor for pics without ads or logins needed (it's annoying!!!).

## Features

- Upload via button, click-to-upload, or drag & drop
- Presets: Natural, Film, Soft Warm, Studio
- Sliders:
	- Color & Tone: Temperature, Tint, Saturation, Vibrance
	- Light & Shadow: Exposure, Contrast, Highlights, Shadows, Vignette
	- Texture & Detail: Film Grain, Skin Soften
- Before/After compare mode with a draggable split handle
- Zoom in/out
- Export edited image as `output.png`
- Shortcuts:
	- `C` toggles compare
	- `Ctrl+S` / `Cmd+S` exports

## How it works (high level)

- The uploaded image is drawn to a canvas.
- Pixels are processed in JavaScript (per-pixel adjustments) on the canvas (the sliders).
- The result is drawn back to the main canvas.
- Compare mode draws the original image on the left portion and the edited image on the right.

## Notes / limitations

- The canvas currently downscales large images to fit (max ~1100×850) to keep things fast.
- Export temporarily disables compare so you always export the edited version.
- I designed this with little to no branding so that it could be re-used by others. 

## Privacy

External assets:

- Google Fonts (DM Sans)
- Font Awesome (icons)
- A sample image URL 

If you want this to be fully offline/private, you can remove/replace those external URLs.
