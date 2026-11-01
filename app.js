(() => {
  'use strict';

  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('mobile-nav');
  const setMenu = (open) => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    menu.hidden = !open;
  };

  menuButton?.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });
  menu?.addEventListener('click', (event) => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });
  window.matchMedia('(min-width: 851px)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });

  document.querySelector('[data-copy-synopsis]')?.addEventListener('click', async () => {
    const synopsis = document.getElementById('synopsis-text');
    const status = document.querySelector('.copy-status');
    const text = Array.from(synopsis.querySelectorAll('p'), (p) => p.textContent.trim()).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = 'Sinopse copiada.';
    } catch {
      status.textContent = 'A cópia não foi permitida pelo navegador. Use “Baixar em texto”.';
    }
  });
})();
