(() => {
  'use strict';
  const root = document.documentElement;
  const motionButtons = Array.from(document.querySelectorAll('.motion-toggle, .menu-motion'));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches;
  try { paused = reduced.matches || localStorage.getItem('codex-motion') === 'paused'; } catch { /* Storage may be unavailable. */ }
  const setMotion = (value) => {
    paused = value;
    root.classList.toggle('motion-paused', value);
    const label = reduced.matches ? 'Animações reduzidas pelo seu dispositivo' : value ? 'Retomar animações' : 'Pausar animações';
    motionButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(value));
      button.setAttribute('aria-label', label);
      button.setAttribute('title', label);
      button.disabled = reduced.matches;
      const text = button.querySelector('.motion-label');
      if (text) text.textContent = label;
    });
  };
  setMotion(paused);
  motionButtons.forEach((button) => button.addEventListener('click', () => {
    setMotion(!paused);
    try { localStorage.setItem('codex-motion', paused ? 'paused' : 'playing'); } catch { /* The control works without persistence. */ }
  }));
  reduced.addEventListener('change', () => {
    let saved = false;
    try { saved = localStorage.getItem('codex-motion') === 'paused'; } catch { /* No stored preference. */ }
    setMotion(reduced.matches || saved);
  });
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-nav');
  const setMenu = (open) => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.hidden = !open;
  };
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  menu?.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') { setMenu(false); menuButton.focus(); }
  });
  window.matchMedia('(min-width: 961px)').addEventListener('change', (event) => { if (event.matches) setMenu(false); });
  document.addEventListener('pointerdown', (event) => {
    if (menuButton?.getAttribute('aria-expanded') === 'true' && !event.target.closest('.site-header')) setMenu(false);
  });
  const setVisibility = () => root.classList.toggle('document-hidden', document.hidden);
  document.addEventListener('visibilitychange', setVisibility);
  setVisibility();
  const hero = document.querySelector('.hero');
  const scene = document.querySelector('.temporal-scene');
  if (hero && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => hero.classList.toggle('scene-offscreen', !entry.isIntersecting));
    observer.observe(hero);
  }
  if (hero && scene && window.matchMedia('(pointer: fine)').matches) {
    let pending = 0;
    hero.addEventListener('pointermove', (event) => {
      if (paused || pending) return;
      pending = requestAnimationFrame(() => {
        const box = hero.getBoundingClientRect();
        scene.style.setProperty('--px', `${(event.clientX - box.left - box.width / 2) * .012}px`);
        scene.style.setProperty('--py', `${(event.clientY - box.top - box.height / 2) * .012}px`);
        pending = 0;
      });
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { scene.style.setProperty('--px', '0px'); scene.style.setProperty('--py', '0px'); });
  }
  document.querySelector('[data-copy-synopsis]')?.addEventListener('click', async () => {
    const synopsis = document.getElementById('synopsis-text');
    const status = document.querySelector('.copy-status');
    const text = Array.from(synopsis.querySelectorAll('p'), p => p.textContent.trim()).join('\n\n');
    try { await navigator.clipboard.writeText(text); status.textContent = 'Sinopse copiada.'; }
    catch { status.textContent = 'A cópia não foi permitida pelo navegador. Use “Baixar em texto”.'; }
  });
})();
