/* ==========================================================================
   ВИДЖЕТ ЧАТА
   --------------------------------------------------------------------------
   Ведёт себя как обычная переписка: окно открывается пустым, никаких
   заготовленных реплик до первого сообщения посетителя. Как только человек
   написал — подключается оператор, отвечает по теме и просит контакты.

   Оператор выбирается один раз за сессию и дальше не меняется: разные
   посетители видят разных, но внутри диалога собеседник постоянный.

   Форма берётся из общего компонента (SITE.ui.formMarkup / bindForm):
   валидация, маска телефона, UTM-метки и вебхук — те же, что и на странице.

   Сценарий и тексты: assets/js/data/chat.js
   ========================================================================== */

(function () {
  'use strict';

  var SITE = window.SITE || {};
  var CFG = SITE.config;
  var DATA = (SITE.data && SITE.data.chat) || null;
  var icon = SITE.icon;
  var ui = SITE.ui;

  if (!DATA || !CFG || !icon || !ui) return; // без зависимостей виджет не поднимаем

  var STORAGE_KEY = 'site_chat_v2';

  var el = {};
  var operator = null;
  var state = {
    open: false,
    hasDialog: false, // было хотя бы одно сообщение
    formShown: false,
    submitted: false,
    busy: false,
  };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ======================================================================
     СОСТОЯНИЕ СЕССИИ
     ====================================================================== */

  function readState() {
    try {
      return JSON.parse(window.sessionStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function saveState(patch) {
    try {
      var data = readState();
      Object.keys(patch).forEach(function (k) { data[k] = patch[k]; });
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      /* приватный режим — работаем без сохранения */
    }
  }

  /** Оператор закрепляется за сессией, чтобы собеседник не менялся по ходу диалога */
  function pickOperator() {
    var list = DATA.operators || [];
    if (!list.length) return null;

    var savedId = readState().operatorId;
    var saved = list.filter(function (o) { return o.id === savedId; })[0];
    if (saved) return saved;

    var chosen = list[Math.floor(Math.random() * list.length)];
    saveState({ operatorId: chosen.id });
    return chosen;
  }

  /* ======================================================================
     РАЗМЕТКА
     ====================================================================== */

  function esc(str) {
    return ui.escape(str);
  }

  function avatarHtml(cls) {
    return (
      '<img class="' + cls + '" src="' + esc(operator.avatar) + '" alt="" role="presentation" ' +
      'width="96" height="96" loading="lazy" decoding="async">'
    );
  }

  function build() {
    var root = document.createElement('div');
    root.className = 'chat';
    root.id = 'chat';
    root.innerHTML =
      '<div class="chat__hint" id="chat-hint" hidden>' +
      '<span>' + esc(DATA.hint) + '</span>' +
      '<button type="button" class="chat__hint-close" aria-label="Скрыть подсказку">' +
      icon('close') + '</button>' +
      '</div>' +

      '<button type="button" class="chat__launcher" id="chat-launcher" ' +
      'aria-expanded="false" aria-controls="chat-panel" aria-label="Написать оператору">' +
      '<span class="chat__launcher-icon chat__launcher-icon--open">' + icon('chat') + '</span>' +
      '<span class="chat__launcher-icon chat__launcher-icon--close">' + icon('close') + '</span>' +
      '</button>' +

      '<section class="chat__panel" id="chat-panel" role="dialog" ' +
      'aria-label="Переписка с оператором" aria-modal="false">' +

      '<header class="chat__head">' +
      '<span class="chat__avatar">' + avatarHtml('chat__avatar-img') +
      '<i class="chat__online" aria-hidden="true"></i></span>' +
      '<span class="chat__ident">' +
      '<span class="chat__title">' + esc(operator.name) + '</span>' +
      '<span class="chat__status" id="chat-status">' + esc(DATA.statusOnline) + '</span>' +
      '<span class="chat__role">' + esc(operator.role) + '</span>' +
      '</span>' +
      '<button type="button" class="chat__close" aria-label="Свернуть переписку">' +
      icon('close') + '</button>' +
      '</header>' +

      '<div class="chat__body" id="chat-body" role="log" aria-live="polite" aria-atomic="false">' +
      '<div class="chat-empty" id="chat-empty">' +
      '<span class="chat-empty__icon">' + icon('chat') + '</span>' +
      '<span class="chat-empty__title">' + esc(DATA.empty.title) + '</span>' +
      '<span class="chat-empty__text">' + esc(DATA.empty.text) + '</span>' +
      '</div>' +
      '</div>' +

      '<div class="chat__suggest" id="chat-suggest">' +
      '<span class="chat__suggest-title">' + esc(DATA.suggestionsTitle) + '</span>' +
      '<div class="chat__suggest-list" id="chat-suggest-list"></div>' +
      '</div>' +

      '<form class="chat__compose" id="chat-compose" novalidate>' +
      '<input type="text" class="chat__field" id="chat-field" autocomplete="off" ' +
      'placeholder="Сообщение…" aria-label="Текст сообщения" maxlength="500">' +
      '<button type="submit" class="chat__send" aria-label="Отправить сообщение">' +
      icon('send') + '</button>' +
      '</form>' +
      '</section>';

    document.body.appendChild(root);

    el.root = root;
    el.hint = root.querySelector('#chat-hint');
    el.launcher = root.querySelector('#chat-launcher');
    el.panel = root.querySelector('#chat-panel');
    el.body = root.querySelector('#chat-body');
    el.empty = root.querySelector('#chat-empty');
    el.status = root.querySelector('#chat-status');
    el.suggest = root.querySelector('#chat-suggest');
    el.suggestList = root.querySelector('#chat-suggest-list');
    el.compose = root.querySelector('#chat-compose');
    el.field = root.querySelector('#chat-field');
    el.close = root.querySelector('.chat__close');

    renderSuggestions();
  }

  /** Переводит переносы строк в абзацы */
  function textToHtml(text) {
    return String(text)
      .split('\n\n')
      .map(function (part) { return '<p>' + esc(part).replace(/\n/g, '<br>') + '</p>'; })
      .join('');
  }

  /** Время сообщения — как в мессенджере */
  function timeNow() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  /* ======================================================================
     ЛЕНТА СООБЩЕНИЙ
     ====================================================================== */

  function scrollDown() {
    window.requestAnimationFrame(function () {
      el.body.scrollTop = el.body.scrollHeight;
    });
  }

  /** Первое сообщение убирает пустое окно */
  function startDialog() {
    if (state.hasDialog) return;
    state.hasDialog = true;
    if (el.empty) el.empty.hidden = true;
  }

  function addMessage(html, who, opts) {
    opts = opts || {};
    startDialog();

    var msg = document.createElement('div');
    msg.className = 'chat-msg chat-msg--' + (who || 'op');

    var inner = '';
    if (who !== 'user') inner += avatarHtml('chat-msg__avatar');
    inner +=
      '<div class="chat-msg__col">' +
      '<div class="chat-msg__bubble' + (opts.wide ? ' chat-msg__bubble--wide' : '') + '">' +
      html +
      '</div>' +
      '<div class="chat-msg__time">' + timeNow() +
      (who === 'user' ? ' ' + icon('check', 'chat-msg__read') : '') +
      '</div>' +
      '</div>';

    msg.innerHTML = inner;
    el.body.appendChild(msg);
    scrollDown();
    return msg;
  }

  function setStatus(typing) {
    if (!el.status) return;
    el.status.textContent = typing ? DATA.statusTyping : DATA.statusOnline;
    el.status.classList.toggle('is-typing', !!typing);
  }

  /** Пузырь с тремя точками */
  function showTyping() {
    startDialog();
    var t = document.createElement('div');
    t.className = 'chat-msg chat-msg--op chat-typing';
    t.innerHTML =
      avatarHtml('chat-msg__avatar') +
      '<div class="chat-msg__col"><div class="chat-msg__bubble">' +
      '<span></span><span></span><span></span></div></div>';
    el.body.appendChild(t);
    scrollDown();
    return t;
  }

  /**
   * Ответ оператора: пауза «читает», затем набор текста.
   * Задержка зависит от длины реплики — так переписка выглядит живой.
   */
  function operatorSay(text, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      if (reduceMotion) {
        addMessage(textToHtml(text), 'op');
        resolve();
        return;
      }

      state.busy = true;
      var readPause = opts.readPause != null ? opts.readPause : 500;

      window.setTimeout(function () {
        setStatus(true);
        var typing = showTyping();
        var typePause = Math.min(2200, 700 + String(text).length * 12);

        window.setTimeout(function () {
          typing.remove();
          setStatus(false);
          addMessage(textToHtml(text), 'op');
          state.busy = false;
          resolve();
        }, typePause);
      }, readPause);
    });
  }

  /* ======================================================================
     ПОДСКАЗКИ (не сообщения — простые кнопки над полем ввода)
     ====================================================================== */

  function renderSuggestions() {
    el.suggestList.innerHTML = DATA.suggestions
      .map(function (q) {
        return '<button type="button" class="chat-chip" data-quick="' + esc(q.id) + '">' +
          esc(q.label) + '</button>';
      })
      .join('');
  }

  function hideSuggestions() {
    if (el.suggest) el.suggest.hidden = true;
  }

  /* ======================================================================
     ФОРМА ВНУТРИ ПЕРЕПИСКИ
     ====================================================================== */

  function showForm() {
    if (state.formShown || state.submitted) return;
    state.formShown = true;

    var msg = addMessage(
      '<p class="chat-form__intro">' + esc(DATA.formIntro) + '</p>' +
        ui.formMarkup({ source: 'Чат на сайте', submitText: 'Отправить' }),
      'op',
      { wide: true }
    );
    msg.classList.add('chat-form');

    var form = msg.querySelector('[data-app-form]');
    ui.bindForm(form);

    // Компонент формы заменяет её блоком успеха — ловим этот момент
    var observer = new MutationObserver(function () {
      if (!msg.querySelector('[data-app-form]')) {
        observer.disconnect();
        onSubmitted();
      }
    });
    observer.observe(msg, { childList: true, subtree: true });

    scrollDown();
  }

  function onSubmitted() {
    state.submitted = true;
    saveState({ submitted: true });
    hideSuggestions();
    el.compose.hidden = true;

    operatorSay(DATA.afterSubmit, { readPause: 400 }).then(function () {
      addMessage(messengerLinks(), 'op', { wide: true });
    });
  }

  function messengerLinks() {
    var items = [
      { key: 'telegram', icon: 'telegram', name: 'Telegram' },
      { key: 'whatsapp', icon: 'whatsapp', name: 'WhatsApp' },
      { key: 'max', icon: 'max', name: 'MAX' },
    ].filter(function (i) { return CFG.social[i.key]; });

    return (
      '<div class="chat-links">' +
      items
        .map(function (i) {
          return '<a class="chat-link chat-link--' + i.key + '" href="' + esc(CFG.social[i.key]) +
            '" target="_blank" rel="noopener">' + icon(i.icon) + '<span>' + esc(i.name) + '</span></a>';
        })
        .join('') +
      '<a class="chat-link chat-link--tel" href="tel:' + esc(CFG.phone.tel) + '">' +
      icon('phone') + '<span>' + esc(CFG.phone.display) + '</span></a>' +
      '</div>'
    );
  }

  /* ======================================================================
     СЦЕНАРИЙ
     ====================================================================== */

  /** Посетитель нажал подсказку */
  function handleQuick(id) {
    if (state.busy) return;
    var item = DATA.suggestions.filter(function (q) { return q.id === id; })[0];
    if (!item) return;

    addMessage(textToHtml(item.label), 'user');
    hideSuggestions();

    operatorSay(item.answer).then(showForm);
  }

  /** Посетитель написал своё сообщение */
  function handleUserText(text) {
    if (state.busy) return;
    addMessage(textToHtml(text), 'user');
    hideSuggestions();

    operatorSay(DATA.fallback).then(showForm);
  }

  /* ======================================================================
     ОТКРЫТИЕ И ЗАКРЫТИЕ
     ====================================================================== */

  function isMobile() {
    return window.matchMedia('(max-width: 599px)').matches;
  }

  function open() {
    if (state.open) return;
    state.open = true;
    el.root.classList.add('is-open');
    el.launcher.setAttribute('aria-expanded', 'true');
    el.launcher.setAttribute('aria-label', 'Свернуть переписку');
    hideHint();

    document.body.classList.add('chat-open');
    if (isMobile()) document.body.classList.add('is-locked');

    window.setTimeout(function () {
      if (!isMobile() && el.field && !el.compose.hidden) el.field.focus();
    }, 260);
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    el.root.classList.remove('is-open');
    el.launcher.setAttribute('aria-expanded', 'false');
    el.launcher.setAttribute('aria-label', 'Написать оператору');
    document.body.classList.remove('is-locked');
    document.body.classList.remove('chat-open');
    el.launcher.focus();
  }

  function toggle() {
    if (state.open) close();
    else open();
  }

  /* ======================================================================
     ПОДСКАЗКА У КНОПКИ (однократная, без автооткрытия)
     ====================================================================== */

  function maybeShowHint() {
    if (readState().hintSeen) return;
    window.setTimeout(function () {
      if (state.open) return;
      el.hint.hidden = false;
      el.root.classList.add('has-hint');
      saveState({ hintSeen: true });
      window.setTimeout(hideHint, 9000);
    }, DATA.hintDelay || 12000);
  }

  function hideHint() {
    el.root.classList.remove('has-hint');
    window.setTimeout(function () {
      if (el.hint) el.hint.hidden = true;
    }, 250);
  }

  /* ======================================================================
     СОБЫТИЯ
     ====================================================================== */

  function bind() {
    el.launcher.addEventListener('click', toggle);
    el.close.addEventListener('click', close);

    el.hint.addEventListener('click', function (e) {
      if (e.target.closest('.chat__hint-close')) {
        hideHint();
        return;
      }
      open();
    });

    el.suggestList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-quick]');
      if (btn) handleQuick(btn.getAttribute('data-quick'));
    });

    el.compose.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = el.field.value.trim();
      if (!text) return;
      el.field.value = '';
      handleUserText(text);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.open) {
        // Модальное окно закрывается первым — чат не перехватывает у него Escape
        if (document.querySelector('.modal.is-open')) return;
        close();
      }
    });

    // Блокировка прокрутки нужна только на смартфоне
    window.addEventListener('resize', function () {
      if (!state.open) return;
      if (isMobile()) document.body.classList.add('is-locked');
      else document.body.classList.remove('is-locked');
    });
  }

  /* ======================================================================
     INIT
     ====================================================================== */

  function init() {
    operator = pickOperator();
    if (!operator) return;

    build();
    bind();

    if (readState().submitted) {
      state.submitted = true;
      el.compose.hidden = true;
      hideSuggestions();
    }

    maybeShowHint();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
