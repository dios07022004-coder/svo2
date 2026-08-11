/* ==========================================================================
   НАБОР ИКОНОК (инлайновый SVG, без внешних библиотек)
   Использование: SITE.icon('shield', 'класс')
   ========================================================================== */

window.SITE = window.SITE || {};

(function () {
  var STROKE = {
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    users:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    phone:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    doc:
      '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
    target:
      '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    gradcap:
      '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12.5V17c0 1.66 2.69 3 6 3s6-1.34 6-3v-4.5"/>',
    ruble: '<path d="M8 18V5h5a3.5 3.5 0 0 1 0 7H6"/><path d="M6 15h8"/>',
    heart:
      '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l8.8 8.8 8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    passport:
      '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="10" r="2.2"/><path d="M14 9h4"/><path d="M14 13h4"/><path d="M6 17h12"/>',
    medkit:
      '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M12 11v6"/><path d="M9 14h6"/>',
    bolt: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    flame:
      '<path d="M12 2c.5 3.5 4.5 5 4.5 9.5A4.5 4.5 0 0 1 12 16a4.5 4.5 0 0 1-4.5-4.5C7.5 9 9 7 12 2z"/><path d="M12 16c3.5 0 6 2 6 4H6c0-2 2.5-4 6-4z"/>',
    scope:
      '<circle cx="12" cy="12" r="8"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/><circle cx="12" cy="12" r="1.5"/>',
    radio:
      '<circle cx="12" cy="12" r="2"/><path d="M7.8 16.2a6 6 0 0 1 0-8.4"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4"/><path d="M4.9 19.1a10 10 0 0 1 0-14.2"/><path d="M19.1 4.9a10 10 0 0 1 0 14.2"/>',
    drone:
      '<rect x="9" y="9" width="6" height="6" rx="1.5"/><circle cx="5" cy="5" r="2.5"/><circle cx="19" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M6.8 6.8 9 9"/><path d="M17.2 6.8 15 9"/><path d="M6.8 17.2 9 15"/><path d="M17.2 17.2 15 15"/>',
    radar:
      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><path d="M12 12 18.4 5.6"/><path d="M12 21v-9"/>',
    crosshair:
      '<circle cx="12" cy="12" r="6"/><path d="M12 2v4"/><path d="M12 18v4"/><path d="M2 12h4"/><path d="M18 12h4"/>',
    wrench:
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z"/>',
    truck:
      '<path d="M1 4h14v12H1z"/><path d="M15 8h4l4 4v4h-8V8z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/>',
    plug:
      '<path d="M9 2v6"/><path d="M15 2v6"/><path d="M6 8h12v3a6 6 0 0 1-12 0V8z"/><path d="M12 17v5"/>',
    briefcase:
      '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>',
    box:
      '<path d="M21 8 12 3 3 8v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v9"/>',
    chip:
      '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 2v3"/><path d="M15 2v3"/><path d="M9 19v3"/><path d="M15 19v3"/><path d="M2 9h3"/><path d="M2 15h3"/><path d="M19 9h3"/><path d="M19 15h3"/>',
    flag:
      '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
    mappin:
      '<path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    wallet:
      '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>',
    umbrella:
      '<path d="M12 2a10 10 0 0 1 10 10H2A10 10 0 0 1 12 2z"/><path d="M12 12v7a3 3 0 0 0 6 0"/>',
    sun:
      '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.2 4.2l1.4 1.4"/><path d="M18.4 18.4l1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M4.2 19.8l1.4-1.4"/><path d="M18.4 5.6l1.4-1.4"/>',
    home:
      '<path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
    percent:
      '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    star:
      '<polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3"/>',
    scales:
      '<path d="M12 3v18"/><path d="M6 21h12"/><path d="M3 8h18"/><path d="M6 8l-3 6a3 3 0 0 0 6 0z"/><path d="M18 8l-3 6a3 3 0 0 0 6 0z"/>',
    edit:
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    signature:
      '<path d="M3 16c3 0 3-8 6-8s3 8 6 8 3-4 6-4"/><path d="M3 21h18"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    arrowRight: '<path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
    arrowUp: '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
    chevronRight: '<polyline points="9 18 15 12 9 6"/>',
    chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
    chevronDown: '<polyline points="6 9 12 15 18 9"/>',
    close: '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
    menu: '<path d="M3 7h18"/><path d="M3 12h18"/><path d="M3 17h18"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    alert:
      '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    external:
      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><path d="M10 14 21 3"/>',
    calendar:
      '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    play: '<polygon points="6 3 20 12 6 21"/>',
    pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    mail:
      '<rect x="2" y="4" width="20" height="16" rx="2"/><polyline points="22 6 12 13 2 6"/>',
    route:
      '<circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M9 19h6a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h6"/>',
    quote:
      '<path d="M10 11H5V8a4 4 0 0 1 4-4v2a2 2 0 0 0-2 2v1h3v6H4v-4"/><path d="M20 11h-5V8a4 4 0 0 1 4-4v2a2 2 0 0 0-2 2v1h3v6h-6v-4"/>',
    list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    award:
      '<circle cx="12" cy="8" r="6"/><polyline points="8.2 13.9 7 22 12 19 17 22 15.8 13.9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    expand: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
    manager: '<circle cx="12" cy="8" r="3.6"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    chat:
      '<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4c-1 0-2-.1-2.9-.4L4 21.5l1.4-4.1A8 8 0 0 1 3 11.5C3 6.8 7 3 12 3s9 3.8 9 8.5z"/><path d="M8.5 10.5h7"/><path d="M8.5 14h4.5"/>',
    send: '<path d="M21 3 10.5 13.5"/><path d="M21 3l-6.8 18-3.7-7.5L3 9.8 21 3z"/>',
    chart:
      '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 15l4-5 3.5 3.5L21 6"/><path d="M21 6h-4"/><path d="M21 6v4"/>',
    // MAX — российский мессенджер: диалоговое облако с литерой M
    max:
      '<path d="M21 11.4c0 4.6-4 8.4-9 8.4-1 0-2-.1-2.9-.4L4 21.6l1.5-4.2A8 8 0 0 1 3 11.4C3 6.8 7 3 12 3s9 3.8 9 8.4z"/><path d="M9 14.6V8.9l3 3.5 3-3.5v5.7"/>',
  };

  var FILLED = {
    vk: '<path d="M12.85 17.1c-5.6 0-9.06-3.9-9.2-10.35h2.83c.1 4.74 2.24 6.76 3.9 7.17V6.75h2.68v4.07c1.6-.17 3.28-2.02 3.85-4.07h2.64c-.44 2.53-2.25 4.38-3.54 5.15 1.29.62 3.35 2.23 4.14 5.2h-2.9c-.62-1.92-2.16-3.41-4.19-3.6v3.6h-.21z"/>',
    telegram:
      '<path d="M21.9 4.6 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.34-4.78 8.7-7.86c.38-.34-.08-.53-.59-.19L6.99 13.11l-4.63-1.45c-1-.31-1.02-1 .21-1.48L20.6 3.1c.85-.31 1.58.2 1.3 1.5z"/>',
    whatsapp:
      '<path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.17c-.24.68-1.42 1.31-1.95 1.35-.5.05-1.13.07-1.83-.11-.42-.11-.96-.29-1.65-.59-2.9-1.25-4.8-4.17-4.95-4.36-.14-.19-1.18-1.57-1.18-3s.75-2.13 1.02-2.42c.27-.29.58-.36.78-.36l.56.01c.18.01.42-.07.66.5.24.59.83 2.02.9 2.17.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.29.37-.42.5-.14.14-.28.29-.12.57.16.29.72 1.18 1.54 1.91 1.06.94 1.95 1.23 2.23 1.37.28.14.44.12.6-.07.17-.19.69-.8.87-1.08.18-.29.36-.24.61-.14.24.09 1.55.73 1.82.86.27.14.44.21.5.31.07.11.07.6-.17 1.28z"/>',
  };

  /**
   * Возвращает разметку SVG-иконки.
   * @param {string} name - имя иконки
   * @param {string} [cls] - дополнительный класс
   */
  window.SITE.icon = function (name, cls) {
    var extra = cls ? ' class="' + cls + '"' : '';
    if (FILLED[name]) {
      return (
        '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"' +
        extra +
        '>' +
        FILLED[name] +
        '</svg>'
      );
    }
    var body = STROKE[name] || STROKE.info;
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"' +
      extra +
      '>' +
      body +
      '</svg>'
    );
  };
})();
