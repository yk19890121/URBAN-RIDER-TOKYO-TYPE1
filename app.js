const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

// B04: only visible photographs advance; hidden tabs, dialogs and reduced motion pause them.
let manuallyPaused = false;
const slideStates = $$('.slideshow').map((element, i) => ({
  element, files: JSON.parse(element.dataset.slides), index: 0,
  visible: false, busy: false, nextAt: performance.now() + 6200 + i * 430,
}));
const visibility = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const state = slideStates.find(s => s.element === entry.target);
    if (state) state.visible = entry.isIntersecting;
  }
}, { threshold: .08 });
slideStates.forEach(s => visibility.observe(s.element));
async function advance(state) {
  if (state.busy || state.files.length < 2) return;
  state.busy = true;
  const old = $('.is-active', state.element);
  const next = $$('.slide', state.element).find(el => el !== old);
  const index = (state.index + 1) % state.files.length;
  next.src = state.files[index];
  next.srcset = `${state.files[index].replace('.webp', '-640.webp')} 640w, ${state.files[index]} 1400w`;
  next.sizes = old.sizes || '(max-width: 600px) 50vw, 60vw';
  try {
    await next.decode();
    if (reduceMotion.matches || manuallyPaused || document.hidden || $('dialog[open]')) return;
    next.classList.add('is-active');
    old.classList.remove('is-active');
    state.index = index;
    // Keep one meaningful image in the accessibility tree.
    next.alt = old.alt;
    next.removeAttribute('aria-hidden');
    old.alt = '';
    old.setAttribute('aria-hidden', 'true');
    const counter = $('.slide-count', state.element.closest('.hero-visual') || state.element);
    if (counter) counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(state.files.length).padStart(2, '0')}`;
  } catch { /* Retain the current image when the next one cannot load. */ }
  finally { state.busy = false; }
}
setInterval(() => {
  if (manuallyPaused || reduceMotion.matches || document.hidden || $('dialog[open]')) return;
  const now = performance.now();
  for (const state of slideStates) {
    if (state.visible && now >= state.nextAt) {
      state.nextAt = now + 6700;
      advance(state);
    }
  }
}, 700);
function syncMotionControls() {
  for (const button of $$('.motion-toggle')) {
    const paused = manuallyPaused || reduceMotion.matches;
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? '画像の自動切替は停止中' : '画像の切替を一時停止');
    if (button.closest('.index-meta')) button.innerHTML = reduceMotion.matches ? '画像の自動切替は停止中' : paused ? '画像の切替を再開 <span>▷</span>' : '画像の切替を一時停止 <span>Ⅱ</span>';
    else button.textContent = paused ? '▷' : 'Ⅱ';
    button.disabled = reduceMotion.matches;
  }
}
$$('.motion-toggle').forEach(button => button.addEventListener('click', () => {
  manuallyPaused = !manuallyPaused;
  syncMotionControls();
}));
reduceMotion.addEventListener('change', syncMotionControls);
syncMotionControls();

// N07: the menu is a real modal dialog, including native focus containment and Escape.
const nav = $('.nav-dialog');
const menuButton = $('.menu-toggle');
let menuClosing = false;
function closeMenu() {
  if (!nav.open || menuClosing) return;
  menuClosing = true;
  nav.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    nav.close();
    menuClosing = false;
    menuButton.focus({ preventScroll: true });
  }, reduceMotion.matches ? 0 : 500);
}
menuButton.addEventListener('click', () => {
  nav.showModal();
  menuButton.setAttribute('aria-expanded', 'true');
  requestAnimationFrame(() => requestAnimationFrame(() => nav.classList.add('is-open')));
  $('.menu-close', nav).focus();
});
$('.menu-close', nav).addEventListener('click', closeMenu);
nav.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });

// G05 / C02: artwork expands from its original bounds into a keyboard-accessible lightbox.
const lightbox = $('.lightbox');
const largeImage = $('.lightbox-image');
let lightboxTrigger;
function expandImage(source, destination, className = '') {
  const from = source.getBoundingClientRect();
  const to = destination.getBoundingClientRect();
  const clone = source.cloneNode();
  clone.removeAttribute('srcset');
  clone.src = source.currentSrc || source.src;
  clone.className = `transition-image ${className}`;
  clone.alt = '';
  clone.setAttribute('aria-hidden', 'true');
  Object.assign(clone.style, { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px` });
  // Append to the dialog when needed so the expansion appears above the top layer.
  (destination.closest('dialog') || document.body).append(clone);
  const animation = clone.animate([
    { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, opacity: 1 },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, opacity: 1 },
  ], { duration: 460, easing: 'cubic-bezier(.25,.7,.2,1)', fill: 'forwards' });
  return animation.finished.finally(() => clone.remove());
}
$$('[data-lightbox]').forEach(button => button.addEventListener('click', async () => {
  lightboxTrigger = button;
  largeImage.src = button.dataset.lightbox;
  largeImage.alt = button.dataset.caption;
  $('.lightbox-caption p').textContent = button.dataset.caption;
  const purchase = $('.lightbox-caption a');
  purchase.hidden = !button.dataset.url;
  if (button.dataset.url) purchase.href = button.dataset.url;
  else purchase.removeAttribute('href');
  lightbox.classList.toggle('dark-image', button.dataset.lightbox.includes('brand-white'));
  lightbox.showModal();
  $('.lightbox-close').focus();
  if (!reduceMotion.matches) {
    try {
      await largeImage.decode();
      if (lightbox.open) await expandImage($('img', button), largeImage);
    } catch { /* The modal remains usable if an animation is interrupted. */ }
  }
}));
function closeLightbox() {
  lightbox.close();
  lightboxTrigger?.focus({ preventScroll: true });
}
$('.lightbox-close').addEventListener('click', closeLightbox);
lightbox.addEventListener('cancel', event => { event.preventDefault(); closeLightbox(); });
lightbox.addEventListener('click', event => {
  if (event.target === lightbox || event.target.classList.contains('lightbox-content')) closeLightbox();
});

// N07: TOP → brand navigation is a circular reveal from the click point. Bookmarkable.
let navigating = false;
addEventListener('pageshow', () => { navigating = false; });
document.documentElement.addEventListener('animationend', event => {
  if (event.animationName === 'veil-open') document.documentElement.classList.remove('wipe-enter');
});
$$('[data-nav-reveal]').forEach(link => link.addEventListener('click', event => {
  if (reduceMotion.matches || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
  event.preventDefault();
  if (navigating) return;
  navigating = true;
  const x = event.clientX || innerWidth / 2;
  const y = event.clientY || innerHeight / 2;
  try { sessionStorage.setItem('urt:wipe', JSON.stringify({ x, y, t: Date.now() })); } catch { /* private mode */ }
  const veil = document.createElement('div');
  veil.className = 'page-veil';
  document.body.append(veil);
  const radius = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)));
  veil.animate(
    [{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${radius}px at ${x}px ${y}px)` }],
    { duration: 500, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' },
  ).finished.finally(() => location.assign(link.href));
}));

// Keep the first editorial group compact. All products exist in the server-rendered HTML.
const productCards = $$('.product-card');
const loadMore = $('.load-more');
let visibleCount = Math.min(6, productCards.length);
function updateProducts() {
  productCards.forEach((card, i) => { card.hidden = i >= visibleCount; });
  if (loadMore) {
    loadMore.hidden = visibleCount >= productCards.length;
    $('.product-progress').textContent = `${String(visibleCount).padStart(2, '0')} / ${String(productCards.length).padStart(2, '0')} ITEMS`;
  }
}
updateProducts();
loadMore?.addEventListener('click', () => {
  const oldCount = visibleCount;
  visibleCount = Math.min(visibleCount + 12, productCards.length);
  updateProducts();
  $('button', productCards[oldCount])?.focus({ preventScroll: true });
});

// I09: transient irregular-edge reveal. No motion preference ever hides content.
const reveals = new IntersectionObserver(entries => {
  for (const entry of entries) if (entry.isIntersecting) {
    if (!reduceMotion.matches) {
      entry.target.classList.add('is-revealing');
      entry.target.addEventListener('animationend', () => entry.target.classList.remove('is-revealing'), { once: true });
    }
    reveals.unobserve(entry.target);
  }
}, { threshold: .12 });
$$('.torn-reveal').forEach(el => reveals.observe(el));

// U08 / U09 / U13: bounded fine-pointer effects; native cursor remains available.
const cursor = $('.custom-cursor');
const effects = $('.fx-layer');
let pointer = null;
let pointerFrame = 0;
let lastInk = 0;
let lifted = new Set();
function addEffect(className, x, y) {
  if (effects.childElementCount > 20) return;
  const effect = document.createElement('i');
  effect.className = className;
  effect.style.left = `${x}px`;
  effect.style.top = `${y}px`;
  effects.append(effect);
  effect.addEventListener('animationend', () => effect.remove(), { once: true });
  setTimeout(() => effect.remove(), 900);
}
function clearLift() {
  for (const el of lifted) {
    el.style.removeProperty('--scale');
    el.style.removeProperty('--px');
    el.style.removeProperty('--py');
  }
  lifted.clear();
}
function drawPointer() {
  pointerFrame = 0;
  if (!pointer || !finePointer.matches || reduceMotion.matches) return;
  const { x, y, target } = pointer;
  const imageTarget = target.closest('[data-cursor]');
  const linkTarget = target.closest('a,button');
  cursor.classList.add('is-visible');
  cursor.classList.toggle('over-image', Boolean(imageTarget));
  cursor.classList.toggle('over-link', Boolean(linkTarget && !imageTarget));
  $('span', cursor).textContent = imageTarget?.dataset.cursor || '';
  const size = imageTarget ? 62 : linkTarget ? 30 : 14;
  cursor.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`;
  if (performance.now() - lastInk > 65 && !$('dialog[open]')) {
    addEffect('ink-dot', x - 4, y - 3);
    lastInk = performance.now();
  }
  clearLift();
  const grid = target.closest('.product-grid');
  if (grid) {
    // G10: near tiles rise, with the directly hovered image receiving the strongest zoom.
    for (const card of $$('.product-card:not([hidden])', grid)) {
      const element = $('.product-image', card);
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      const dx = x - rect.left - rect.width / 2;
      const dy = y - rect.top - rect.height / 2;
      const proximity = Math.max(0, 1 - Math.hypot(dx, dy) / Math.max(220, rect.width));
      if (proximity > 0) {
        const direct = target.closest('.product-image') === element;
        element.style.setProperty('--scale', String(1 + proximity * (direct ? .17 : .045)));
        element.style.setProperty('--px', `${dx * .013 * proximity}px`);
        element.style.setProperty('--py', `${-7 * proximity}px`);
        lifted.add(element);
      }
    }
  }
}
document.addEventListener('pointermove', event => {
  if (!finePointer.matches || reduceMotion.matches || event.pointerType === 'touch') return;
  pointer = { x: event.clientX, y: event.clientY, target: event.target };
  if (!pointerFrame) pointerFrame = requestAnimationFrame(drawPointer);
}, { passive: true });
document.addEventListener('pointerleave', () => { cursor.classList.remove('is-visible'); clearLift(); });
document.addEventListener('click', event => {
  if (!reduceMotion.matches && event.detail > 0 && !$('dialog[open]')) addEffect('shockwave', event.clientX, event.clientY);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) { cursor.classList.remove('is-visible'); clearLift(); } });
reduceMotion.addEventListener('change', () => { cursor.classList.remove('is-visible'); clearLift(); effects.replaceChildren(); });
