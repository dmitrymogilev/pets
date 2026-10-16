// Theme switcher. Loaded in <head> on every page, before paint, so the saved
// theme applies without a flash. Fonts load from Google Fonts per theme; the
// CSS has local fallbacks for every family.
(function () {
  'use strict';
  const THEMES = [
    { key: 'pocket', name: 'Pocket', fonts: 'VT323' },
    { key: 'kennel', name: 'Kennel card', fonts: 'Courier+Prime:ital,wght@0,400;0,700;1,400&family=Special+Elite' },
    { key: 'nightlight', name: 'Nightlight', fonts: 'Fraunces:ital,opsz,wght,SOFT@0,9..144,300..700,100;1,9..144,300..700,100&family=Instrument+Sans:wght@400;500;600' },
    { key: 'sticker', name: 'Sticker', fonts: 'Fredoka:wght@400..700' },
    { key: 'comic', name: 'Comic', fonts: 'Bangers&family=Comic+Neue:ital,wght@0,400;0,700;1,400' },
    { key: 'aquarium', name: 'Aquarium', fonts: 'Baloo+2:wght@500;700&family=Nunito:wght@400;600;700' },
    { key: 'picnic', name: 'Picnic', fonts: 'Lilita+One&family=Mulish:wght@400;600;700' },
    { key: 'blueprint', name: 'Blueprint', fonts: 'Saira+Condensed:wght@500;600&family=Saira:wght@400;500;600' },
    { key: 'zoo', name: 'Zoo signs', fonts: 'Archivo+Black&family=Archivo:wght@400;500;600' },
    { key: 'theater', name: 'Theater', fonts: 'Limelight&family=Lora:ital,wght@0,400..700;1,400' },
  ];
  const KEY = 'pets-theme';
  const DEFAULT = THEMES[0].key;

  function get() {
    try {
      const v = localStorage.getItem(KEY);
      return THEMES.some((t) => t.key === v) ? v : DEFAULT;
    } catch (e) { return DEFAULT; }
  }

  function loadFonts(key) {
    const t = THEMES.find((x) => x.key === key);
    if (!t || document.getElementById('font-' + key)) return;
    const link = document.createElement('link');
    link.id = 'font-' + key;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + t.fonts + '&display=swap';
    document.head.appendChild(link);
  }

  function apply(key) {
    document.documentElement.setAttribute('data-theme', key);
    loadFonts(key);
  }

  function set(key) {
    if (!THEMES.some((t) => t.key === key)) return;
    try { localStorage.setItem(KEY, key); } catch (e) { /* private mode: theme lasts for this page only */ }
    apply(key);
    document.dispatchEvent(new CustomEvent('pets-theme', { detail: key }));
  }

  // Build the tab strip on the main page. Arrow keys move between tabs.
  function tabs(container) {
    container.replaceChildren();
    THEMES.forEach((t) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.role = 'tab';
      b.className = 'theme-tab';
      b.dataset.key = t.key;
      b.textContent = t.name;
      b.addEventListener('click', () => { set(t.key); sync(); });
      container.appendChild(b);
    });
    container.addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const i = THEMES.findIndex((t) => t.key === get());
      const n = (i + (ev.key === 'ArrowRight' ? 1 : THEMES.length - 1)) % THEMES.length;
      set(THEMES[n].key); sync();
      container.children[n].focus();
      ev.preventDefault();
    });
    function sync() {
      const cur = get();
      Array.from(container.children).forEach((b) => {
        const on = b.dataset.key === cur;
        b.setAttribute('aria-selected', on ? 'true' : 'false');
        b.tabIndex = on ? 0 : -1;
      });
    }
    sync();
  }

  apply(get());
  window.PetsTheme = { THEMES, get, set, tabs };
})();
