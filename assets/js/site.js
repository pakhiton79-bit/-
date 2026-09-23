/* Небольшой скрипт сайта: без зависимостей, без сборки.
   Всё, что он делает, - необязательное украшение: без него страницы читаются полностью. */
(function () {
  'use strict';

  /* ---------- Подсветка активного пункта якорной навигации ---------- */

  function initAnchorNav() {
    var nav = document.querySelector('.anchor-nav');
    if (!nav || !('IntersectionObserver' in window)) return;

    var links = Array.prototype.slice.call(nav.querySelectorAll('a[href^="#"]'));
    if (!links.length) return;

    var byId = {};
    var sections = [];

    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      var section = document.getElementById(id);
      if (!section) return;
      byId[id] = link;
      sections.push(section);
    });

    if (!sections.length) return;

    var visible = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });

      // Активным считаем самый верхний из видимых разделов.
      var current = null;
      for (var i = 0; i < sections.length; i++) {
        if (visible[sections[i].id]) { current = sections[i].id; break; }
      }

      links.forEach(function (link) { link.classList.remove('is-active'); });
      if (current && byId[current]) byId[current].classList.add('is-active');
    }, { rootMargin: '-96px 0px -55% 0px', threshold: 0 });

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ---------- Появление событий ленты времени ---------- */

  function revealAll(items) {
    items.forEach(function (item) { item.classList.add('is-visible'); });
  }

  function initTimelineReveal() {
    var items = Array.prototype.slice.call(document.querySelectorAll('.tl-item'));
    if (!items.length) return null;

    var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealAll(items);
      return items;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });

    items.forEach(function (item) { observer.observe(item); });
    return items;
  }

  /* ---------- Отбор событий ленты по эпохе ---------- */

  function initTimelineFilters(items) {
    var group = document.querySelector('.timeline-filters');
    if (!group || !items) return;

    var buttons = Array.prototype.slice.call(group.querySelectorAll('button[data-era]'));
    var empty = document.querySelector('.timeline-empty');

    function apply(era) {
      var shown = 0;

      items.forEach(function (item) {
        var match = era === 'all' || item.getAttribute('data-era') === era;
        item.hidden = !match;
        if (match) {
          shown++;
          // Отфильтрованное событие могло быть скрыто до того, как его заметил
          // наблюдатель появления, поэтому показываем его явно.
          item.classList.add('is-visible');
        }
      });

      buttons.forEach(function (button) {
        var active = button.getAttribute('data-era') === era;
        button.classList.toggle('pill--filled', active);
        button.classList.toggle('pill--outline', !active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
      });

      if (empty) empty.hidden = shown !== 0;
    }

    buttons.forEach(function (button) {
      button.addEventListener('click', function () {
        apply(button.getAttribute('data-era'));
      });
    });

    apply('all');
  }

  /* ---------- Запуск ---------- */

  function init() {
    initAnchorNav();
    initTimelineFilters(initTimelineReveal());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
