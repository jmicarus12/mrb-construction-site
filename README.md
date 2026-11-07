# MRB Construction Services

One-stop construction & interior works. The whole page is a small 3D construction
lot built with Three.js. Four scenes are built on the concrete pad, one at a time:

| Tab | Scene | Panel |
|---|---|---|
| 01 Cabinetry | Wood-grain kitchen, tall pantry units (one door swings), island, rattan chair | `#cabinets` |
| 02 Glass | Two-storey house with blue reflective sliding windows and a black steel balcony rail | `#glass` |
| 03 Roofing | Bungalow getting clay tiles row by row while a painter rolls the front wall | `#roofing` |
| 04 Ceilings | A room with a floating halo ceiling, blue cove LED, half still on the furring grid | `#ceiling` |

A tower crane hangs a sign over the building that names the current scene; tap it
to open that service. The lot itself stays: the **site office** opens *About*, the **project signboard**
opens *Get a quote*. The dock opens Services, Projects, About and Contact, and every
panel has its own URL (`/#glass`, `/#contact`, …). Drag to orbit, scroll to zoom,
`←` `→` switch scenes.

## Editing content

All text lives in **`src/content.js`**:

- `CONFIG`: name, e-mail, phone numbers, service area, Facebook link.
  `null` shows a dashed “Add …” placeholder on the site. **Still to fill in:**
  `serviceArea` and `facebook`.
- `SCENES`: the four services with a 3D scene (title, headline, bullet points).
- `EXTRAS`: services without a scene (stainless steel, signages, rattan).
- `PROJECTS`: the Projects grid.

Service descriptions were written from the MRB flyers. Have MRB check them.

### Adding project photos

1. Put the photo in `public/projects/`, e.g. `public/projects/blue-glass-1.jpg`
   (about 1400px on the long side).
2. Set `img: 'blue-glass-1.jpg'` on that entry in `PROJECTS`, or add a new entry.
   `scene` decides which filter it shows under.

## Files

| File | Contents |
|---|---|
| `index.html` | Page shell: intro, brand, tabs, hero, dock, drawer, lightbox |
| `src/content.js` | All copy and contact details |
| `src/site.js` | Panels, tabs, drawer, quote form, lightbox, intro |
| `src/scene.js` | The 3D lot, the four scenes, camera moves, pins and hover |
| `src/style.css` | Tokens and all styles |

`scene.js` is loaded as a separate chunk. If WebGL fails, the site shows a
blueprint drawing instead and every panel still works from the dock.

## Develop

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # outputs dist/
npm run preview    # serve the build
```

## Deploy on Vercel

Push the repo to GitHub, then in Vercel choose **Add New → Project** and import it.
Vercel detects Vite automatically (build: `npm run build`, output: `dist`). No
config file needed.
