/* ===================================================================
   MRB Construction Services — every word on the site lives here.
   Edit this file to change text, contact details, services or projects.
   A value set to null shows a dashed "Add …" placeholder on the site.
   =================================================================== */

export const CONFIG = {
  name: 'MRB Construction Services',
  short: 'MRB Construction',
  tagline: 'One-stop construction & interior works',
  email: 'mrb.constructionteam@gmail.com',
  phones: ['09556076497', '09327024385'],
  // TODO: fill these in once you have them
  serviceArea: null,   // e.g. 'Cebu City, Mandaue and nearby'
  facebook: null       // e.g. 'https://facebook.com/...'
};

/* The four services that have their own 3D scene, in tab order.
   key   → also the URL hash (#cabinets) and the scene name in scene.js  */
export const SCENES = [
  {
    key: 'cabinets',
    tab: 'Cabinetry',
    title: 'Cabinetry',
    headline: 'Kitchens built to fit.',
    short: 'Kitchen cabinets and built-ins, measured and made for your space.',
    lead: 'Kitchen cabinets and built-ins made to measure, from the tall pantry units to the last shelf.',
    items: [
      ['Kitchen cabinets', 'Base and wall units with wood-grain finishes and solid countertops.'],
      ['Built-ins', 'Tall pantry and storage units that use the full wall height.'],
      ['Under-cabinet lighting', 'LED strips so the counter is never in shadow.']
    ]
  },
  {
    key: 'glass',
    tab: 'Glass',
    title: 'Glass & Aluminum',
    headline: 'Cooler rooms, clear views.',
    short: 'Tempered glass sliding doors and windows in aluminum frames.',
    lead: 'Blue reflective tempered glass — perfect for sliding doors and windows.',
    benefits: ['Heat reduction', 'Daytime privacy', 'Glare control', 'Strong & safe'],
    items: [
      ['Sliding doors & windows', 'Aluminum-framed sliding units, fitted and sealed.'],
      ['Blue reflective tempered glass', 'Keeps rooms cooler and private by day.'],
      ['Railings', 'Steel balcony railings to match the facade.']
    ]
  },
  {
    key: 'roofing',
    tab: 'Roofing',
    title: 'Roofing, Painting & Finishing',
    headline: 'From the roof down.',
    short: 'Roof tiles, gutters, then painting and finishing for the whole house.',
    lead: 'Roofing that keeps the weather out, then painting and finishing so the house looks done.',
    items: [
      ['Roofing', 'Tile roofing on a properly framed and battened roof.'],
      ['Gutters & flashing', 'So rainwater goes where it should.'],
      ['Painting & finishing', 'Interior and exterior walls, primed and painted.']
    ]
  },
  {
    key: 'ceiling',
    tab: 'Ceilings',
    title: 'Ceilings & Lighting',
    headline: 'Ceilings that glow.',
    short: 'Dropped and cove ceilings with LED halo and accent lighting.',
    lead: 'Dropped, cove and feature ceilings, finished with LED lighting that sets the mood of the whole room.',
    items: [
      ['Feature ceilings', 'Circular halo and layered designs with hidden cove lighting.'],
      ['Dropped ceilings', 'Clean gypsum board on a level metal furring frame.'],
      ['Lighting', 'Recessed downlights and LED strips, planned with the ceiling.']
    ]
  }
];

/* Services without a 3D scene, listed under "Also from MRB". */
export const EXTRAS = [
  ['Stainless steel works', 'Railings, counters and fabrication.'],
  ['Custom signages', 'Signs for shops, offices and sites.'],
  ['Handcrafted rattan furniture', 'Chairs and pieces made by hand.']
];

/* Projects. Put photos in public/projects/ and set `img` to the file name.
   Entries with img: null show a "photo coming soon" tile.
   scene → which service filter the project appears under.            */
export const PROJECTS = [
  { title: 'Circular cove ceiling with blue LED', scene: 'ceiling',  img: null },
  { title: 'Wood-grain kitchen with LED strip',   scene: 'cabinets', img: null },
  { title: 'Blue reflective sliding windows',     scene: 'glass',    img: null },
  { title: 'Balcony glass and steel railing',     scene: 'glass',    img: null },
  { title: 'Aluminum sliding windows',            scene: 'glass',    img: null },
  { title: 'Clay roof tile installation',         scene: 'roofing',  img: null }
];
