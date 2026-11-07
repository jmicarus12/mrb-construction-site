import './style.css';
import './site.js';

// The 3D scene is its own chunk: the intro and the panels work while three.js
// downloads, and if WebGL or the chunk fails, the site still works without it.
import('./scene.js').catch(err => {
  console.error(err);
  document.documentElement.classList.add('no-webgl');
});
