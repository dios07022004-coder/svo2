/* ==========================================================================
   UTM-МЕТКИ И ИСТОЧНИК ПЕРЕХОДА
   --------------------------------------------------------------------------
   Метки снимаются из адресной строки при первом заходе и сохраняются
   на время сессии. Пользователь может переходить по разделам и открывать
   модальные окна — источник не потеряется и уйдёт вместе с заявкой.

   Использование: SITE.utm() -> объект с метками
   ========================================================================== */

window.SITE = window.SITE || {};

(function () {
  var STORAGE_KEY = 'site_utm_v1';

  var UTM_KEYS = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
    // Идентификаторы рекламных систем
    'gclid',
    'yclid',
    'ymclid',
    'fbclid',
    'roistat',
    'rb_clickid',
  ];

  /** Безопасная работа с sessionStorage: в приватном режиме он может быть недоступен */
  function readStore() {
    try {
      var raw = window.sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeStore(data) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* приватный режим — работаем без сохранения */
    }
  }

  function fromQuery() {
    var found = {};
    var query = window.location.search;
    if (!query || query.length < 2) return found;

    query
      .replace(/^\?/, '')
      .split('&')
      .forEach(function (pair) {
        if (!pair) return;
        var idx = pair.indexOf('=');
        var key = decodeURIComponent((idx < 0 ? pair : pair.slice(0, idx)).replace(/\+/g, ' '));
        var value = idx < 0 ? '' : decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
        if (UTM_KEYS.indexOf(key) !== -1 && value) {
          found[key] = value.slice(0, 200); // ограничение длины на всякий случай
        }
      });

    return found;
  }

  /** Источник перехода: откуда пользователь пришёл, если меток нет */
  function detectReferrer() {
    var ref = document.referrer || '';
    if (!ref) return 'direct';
    try {
      var host = new URL(ref).hostname.replace(/^www\./, '');
      if (host === window.location.hostname.replace(/^www\./, '')) return 'internal';
      return host;
    } catch (e) {
      return ref.slice(0, 120);
    }
  }

  var saved = readStore();
  var current = fromQuery();

  // Новые метки в адресе перекрывают сохранённые: последний переход важнее
  var data;
  if (Object.keys(current).length) {
    data = current;
    data.landing_page = window.location.pathname + window.location.search;
    data.referrer = detectReferrer();
    data.first_seen = new Date().toISOString();
    writeStore(data);
  } else if (saved) {
    data = saved;
  } else {
    data = {
      landing_page: window.location.pathname + window.location.search,
      referrer: detectReferrer(),
      first_seen: new Date().toISOString(),
    };
    writeStore(data);
  }

  /**
   * Возвращает копию собранных меток.
   * @returns {Object}
   */
  window.SITE.utm = function () {
    var copy = {};
    Object.keys(data).forEach(function (k) {
      copy[k] = data[k];
    });
    return copy;
  };
})();
