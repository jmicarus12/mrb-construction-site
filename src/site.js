/* ===================================================================
   Site chrome — MRB Construction Services
   Tabs, hero, dock, drawer panels, lightbox and intro. Works on its own:
   if the 3D scene (scene.js) fails, every panel still opens.
   Talks to the scene through window.MRB and four events:
     mrb:reveal    intro is out of the way, build the site
     mrb:scenario  switch the 3D scene        (detail.key)
     mrb:open      a panel opened             (detail.key)
     mrb:close     the panel closed
   =================================================================== */
import { CONFIG, SCENES, EXTRAS, PROJECTS } from './content.js';

const root = document.documentElement;
const $ = id => document.getElementById(id);
const MRB = window.MRB = window.MRB || {};
const byKey = Object.fromEntries(SCENES.map(s => [s.key, s]));
const emit = (name, detail = {}) => window.dispatchEvent(new CustomEvent(name, { detail }));

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todo = label => `<span class="todo">${esc(label)}</span>`;
const fmtPhone = p => p.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3');
const telHref = p => 'tel:+63' + p.replace(/^0/, '');
const num = i => String(i + 1).padStart(2, '0');

/* ---- panels ------------------------------------------------------------ */
function serviceCard(s, i) {
  // the whole card is the link to that service
  return `<article class="svc" data-go="${s.key}" role="link" tabindex="0" aria-label="${esc(s.title)}">
    <span class="n">${num(i)} / ${num(SCENES.length - 1)}</span>
    <h3>${esc(s.title)}</h3>
    <p>${esc(s.short)}</p>
    <span class="go" aria-hidden="true">View service &#8594;</span>
  </article>`;
}

function servicePanel(s) {
  const i = SCENES.indexOf(s);
  const next = SCENES[(i + 1) % SCENES.length];
  return {
    kicker: `Service ${num(i)} / ${num(SCENES.length - 1)}`,
    title: s.title,
    html: () => `
      <p class="lead">${esc(s.lead)}</p>
      ${s.benefits ? `<ul class="checks">${s.benefits.map(b => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
      <h3 class="sub">What we do</h3>
      <div class="items">${s.items.map(([t, d]) => `<div class="item"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}</div>
      <button class="btn btn-solid" type="button" data-go="contact" data-service="${s.key}">Get a quote for this</button>
      <button class="btn btn-line" type="button" data-go="projects" data-filter="${s.key}">See projects</button>
      <button class="next" type="button" data-go="${next.key}"><small>Next service</small><b>${esc(next.title)} &#8594;</b></button>`
  };
}

const PANELS = {
  services: {
    kicker: 'What we do',
    title: 'One-stop construction & interior works',
    html: () => `
      <p class="lead">From cabinetry and ceiling works to roofing, glass, stainless steel, painting and finishing — one team for the whole job.</p>
      <div class="svcs">${SCENES.map(serviceCard).join('')}</div>
      <h3 class="sub">Also from MRB</h3>
      <div class="items">${EXTRAS.map(([t, d]) => `<div class="item"><b>${esc(t)}</b><span>${esc(d)}</span></div>`).join('')}</div>
      <button class="btn btn-solid" type="button" data-go="contact">Get a quote</button>`
  },
  projects: {
    kicker: 'Projects',
    title: 'Recent work',
    html: () => {
      const chips = [['all', 'All'], ...SCENES.map(s => [s.key, s.tab])]
        .map(([k, l]) => `<button type="button" class="chip${k === 'all' ? ' on' : ''}" data-cat="${k}">${esc(l)}</button>`).join('');
      const tiles = PROJECTS.map((p, i) => {
        const tag = byKey[p.scene] ? byKey[p.scene].title : '';
        const pic = p.img
          ? `<img src="/projects/${encodeURI(p.img)}" alt="${esc(p.title)}" loading="lazy">`
          : `<i class="ph" aria-hidden="true">Photo coming soon</i>`;
        return `<button type="button" class="tile${p.img ? '' : ' empty'}" data-i="${i}" data-cat="${p.scene}"${p.img ? '' : ' aria-disabled="true"'}>
          ${pic}<span><small>${esc(tag)}</small><b>${esc(p.title)}</b></span></button>`;
      }).join('');
      return `<div class="chips" role="toolbar" aria-label="Filter">${chips}</div><div class="grid">${tiles}</div>`;
    }
  },
  about: {
    kicker: 'About MRB',
    title: 'Your one-stop partner.',
    html: () => `
      <p class="lead">MRB Construction Services handles construction and interior works under one roof, so you deal with one team from the first measurement to the final coat of paint.</p>
      <div class="steps">
        <div class="step"><b>Plan</b><span>Site visit, measurements and a clear quote</span></div>
        <div class="step"><b>Build</b><span>Our own team on every trade</span></div>
        <div class="step"><b>Finish</b><span>Painting, lighting and cleanup</span></div>
      </div>
      <h3 class="sub">Everything we handle</h3>
      <div class="tags">${[...SCENES.map(s => s.title), ...EXTRAS.map(e => e[0])].map(t => `<span>${esc(t)}</span>`).join('')}</div>
      <h3 class="sub">Where we work</h3>
      <p>${CONFIG.serviceArea ? esc(CONFIG.serviceArea) : todo('Add service area')}</p>
      <button class="btn btn-solid" type="button" data-go="contact">Talk to us</button>`
  },
  contact: {
    kicker: 'Get a quote',
    title: 'Let’s build it.',
    html: () => `
      <p>Tell us what you need and where. We’ll get back to you with the next steps and an estimate.</p>
      <div class="deets">
        ${CONFIG.phones.map((p, i) => `<a class="deet" href="${telHref(p)}"><span>${i ? 'Phone' : 'Call or text'}</span><b>${fmtPhone(p)}</b></a>`).join('')}
        <a class="deet" href="mailto:${CONFIG.email}"><span>E-mail</span><b>${CONFIG.email}</b></a>
        ${CONFIG.facebook
          ? `<a class="deet" href="${esc(CONFIG.facebook)}" target="_blank" rel="noopener"><span>Facebook</span><b>Message us on Facebook</b></a>`
          : `<div class="deet"><span>Facebook</span><b>${todo('Add Facebook page')}</b></div>`}
      </div>
      <h3 class="sub">Request a quote</h3>
      <form class="quote" id="quote">
        <label><span>Your name</span><input name="name" required autocomplete="name"></label>
        <label><span>Service</span><select name="service">
          ${[...SCENES.map(s => s.title), ...EXTRAS.map(e => e[0]), 'Something else'].map(t => `<option>${esc(t)}</option>`).join('')}
        </select></label>
        <label><span>Location</span><input name="where" placeholder="City / barangay"></label>
        <label><span>Details</span><textarea name="msg" rows="4" placeholder="Size, timeline, photos you can send…"></textarea></label>
        <button class="btn btn-solid" type="submit">Send by e-mail &#8594;</button>
        <button class="btn btn-line" type="button" id="copymail">Copy e-mail address</button>
        <p class="note">Opens your e-mail app with the details filled in.</p>
      </form>`
  }
};
SCENES.forEach(s => { PANELS[s.key] = servicePanel(s); });

/* ---- scenes: tabs + hero ------------------------------------------------ */
const tabs = $('tabs');
tabs.innerHTML = SCENES.map((s, i) =>
  `<button type="button" data-scene="${s.key}"><small>${num(i)}</small>${esc(s.tab)}</button>`).join('');
const tabBtns = tabs.querySelectorAll('button');

MRB.scenario = byKey[location.hash.slice(1)] ? location.hash.slice(1) : SCENES[0].key;

function setScene(key) {
  const s = byKey[key];
  if (!s) return;
  const changed = MRB.scenario !== key;
  MRB.scenario = key;
  tabBtns.forEach(b => {
    const on = b.dataset.scene === key;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on);
  });
  const i = SCENES.indexOf(s);
  $('hero-n').textContent = `${num(i)} / ${num(SCENES.length - 1)} · ${s.title}`;
  $('hero-h').textContent = s.headline;
  $('hero-p').textContent = s.short;
  if (changed) emit('mrb:scenario', { key });
}
MRB.setScene = setScene;
setScene(MRB.scenario);

tabs.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  // keep a service panel in step with the tab; other panels stay open
  if (current && byKey[current]) open(b.dataset.scene);
  else setScene(b.dataset.scene);
});
$('hero-go').addEventListener('click', () => open(MRB.scenario));

/* ---- drawer -------------------------------------------------------------- */
const drawer = $('drawer');
const dKick = $('d-kicker'), dTitle = $('d-title'), dBody = $('d-body');
const dock = document.querySelectorAll('.dock button');
let current = null, lastFocus = null;

function open(key, opts = {}) {
  const p = PANELS[key];
  if (!p) return;
  if (byKey[key]) setScene(key);
  if (current !== key) {
    dKick.textContent = p.kicker;
    dTitle.textContent = p.title;
    dBody.innerHTML = p.html();
    dBody.scrollTop = 0;
  }
  if (!current) lastFocus = document.activeElement;
  current = key;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  root.classList.add('panel-open');
  dock.forEach(b => b.classList.toggle('active', b.dataset.panel === key || (b.dataset.panel === 'services' && !!byKey[key])));
  if (location.hash !== '#' + key) history.replaceState(null, '', '#' + key);
  if (opts.filter) filter(opts.filter);
  if (opts.service) {
    const sel = dBody.querySelector('select[name=service]');
    if (sel) sel.value = byKey[opts.service].title;
  }
  emit('mrb:open', { key });
  setTimeout(() => $('d-close').focus({ preventScroll: true }), 60);
}

function close() {
  if (!current) return;
  current = null;
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  root.classList.remove('panel-open');
  dock.forEach(b => b.classList.remove('active'));
  history.replaceState(null, '', location.pathname + location.search);
  emit('mrb:close');
  if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
}

MRB.open = open;
MRB.close = close;
MRB.current = () => current;

dock.forEach(b => b.addEventListener('click', () => {
  if (current === b.dataset.panel) close(); else open(b.dataset.panel);
}));
$('d-close').addEventListener('click', close);

function filter(cat) {
  dBody.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.cat === cat));
  dBody.querySelectorAll('.tile').forEach(t => { t.hidden = !(cat === 'all' || t.dataset.cat === cat); });
}

dBody.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { open(go.dataset.go, { filter: go.dataset.filter, service: go.dataset.service }); return; }

  const chip = e.target.closest('.chip');
  if (chip) { filter(chip.dataset.cat); return; }

  const tile = e.target.closest('.tile');
  if (tile && !tile.classList.contains('empty')) { showProject(+tile.dataset.i); return; }

  if (e.target.id === 'copymail' && navigator.clipboard) {
    navigator.clipboard.writeText(CONFIG.email).then(() => {
      e.target.textContent = 'Copied ✓';
      setTimeout(() => { e.target.textContent = 'Copy e-mail address'; }, 1800);
    });
  }
});

// cards with data-go aren't buttons: open them with Enter / Space too
dBody.addEventListener('keydown', e => {
  const card = e.target.closest('.svc[data-go]');
  if (card && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(card.dataset.go); }
});

dBody.addEventListener('submit', e => {
  if (e.target.id !== 'quote') return;
  e.preventDefault();
  const f = new FormData(e.target);
  const subject = `Quote request — ${f.get('service')}`;
  const body = [
    `Name: ${f.get('name')}`,
    `Service: ${f.get('service')}`,
    `Location: ${f.get('where') || '-'}`,
    '',
    f.get('msg') || ''
  ].join('\n');
  location.href = `mailto:${CONFIG.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});

/* ---- lightbox ------------------------------------------------------------ */
const lb = $('lightbox');
function showProject(i) {
  const p = PROJECTS[i];
  if (!p || !p.img) return;
  $('lb-img').src = '/projects/' + encodeURI(p.img);
  $('lb-img').alt = p.title;
  $('lb-cap').textContent = p.title;
  lb.classList.add('open');
  lb.setAttribute('aria-hidden', 'false');
  $('lb-close').focus({ preventScroll: true });
}
function closeLb() {
  lb.classList.remove('open');
  lb.setAttribute('aria-hidden', 'true');
}
$('lb-close').addEventListener('click', closeLb);
lb.addEventListener('click', e => { if (e.target === lb || e.target.tagName === 'FIGURE') closeLb(); });

// next / previous scene: the crane sign and the arrow keys.
// A service panel that's open follows along.
MRB.step = dir => {
  const i = SCENES.findIndex(s => s.key === MRB.scenario);
  const n = SCENES[(i + dir + SCENES.length) % SCENES.length].key;
  if (current && byKey[current]) open(n); else setScene(n);
};

// links to #glass, #contact etc. from inside the page
window.addEventListener('hashchange', () => {
  const key = location.hash.slice(1);
  if (PANELS[key]) open(key);
});

/* ---- keys -------------------------------------------------------------- */
window.addEventListener('keydown', e => {
  if (lb.classList.contains('open')) { if (e.key === 'Escape') closeLb(); return; }
  if (e.key === 'Escape') { close(); return; }
  if (root.classList.contains('intro-run')) return;
  const tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
  if (e.key === 'ArrowRight') MRB.step(1);
  else if (e.key === 'ArrowLeft') MRB.step(-1);
});

/* ---- intro ------------------------------------------------------------------
   draft (the house is drawn) → stamp (name) → roll (the sheet rolls up).
   The site starts building as the sheet lifts.                              */
const intro = $('intro');
const timers = [];

function reveal() {
  if (MRB.revealed) return;
  MRB.revealed = true;
  emit('mrb:reveal');
  const key = location.hash.slice(1);
  if (PANELS[key]) setTimeout(() => open(key), root.classList.contains('intro-skip') ? 500 : 1500);
}

function finish(skipped) {
  timers.forEach(clearTimeout);
  try { sessionStorage.setItem('mrb.intro', '1'); } catch (e) { /* private mode */ }
  intro.classList.add('drafted', 'stamped', 'roll');
  root.classList.remove('intro-run');
  root.classList.add('intro-settle');
  reveal();
  setTimeout(() => intro.classList.add('done'), skipped ? 800 : 1100);
}

if (root.classList.contains('intro-run') && intro) {
  requestAnimationFrame(() => intro.classList.add('drafting'));
  timers.push(setTimeout(() => intro.classList.add('drafted'), 1500));
  timers.push(setTimeout(() => intro.classList.add('stamped'), 1650));
  timers.push(setTimeout(() => finish(false), 3000));
  const skip = () => finish(true);
  $('skip').addEventListener('click', skip);
  intro.addEventListener('click', skip);
  window.addEventListener('keydown', function k(e) {
    if (!root.classList.contains('intro-run')) { window.removeEventListener('keydown', k); return; }
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') { e.preventDefault(); skip(); }
  });
} else {
  if (intro) intro.classList.add('done');
  reveal();
}

/* ---- failsafe: no 3D after a while → show the blueprint instead ---------- */
setTimeout(() => {
  if (!root.classList.contains('scene-ready')) root.classList.add('no-webgl');
}, 9000);
