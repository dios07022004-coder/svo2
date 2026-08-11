/* ==========================================================================
   КОНТРАКТ СВО — приложение
   --------------------------------------------------------------------------
   Ванильный JS без зависимостей. Разделено на модули:
   utils → Modal → Forms → Carousel → рендер секций → навигация → init
   ========================================================================== */

(function () {
  'use strict';

  var CFG = window.SITE.config;
  var DATA = window.SITE.data;
  var icon = window.SITE.icon;

  /* ========================================================================
     UTILS
     ======================================================================== */

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  /** Экранирование пользовательского/контентного текста */
  function esc(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var MONTHS = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ];

  function formatDate(iso) {
    var parts = String(iso).split('-');
    if (parts.length !== 3) return iso;
    var d = parseInt(parts[2], 10);
    var m = parseInt(parts[1], 10) - 1;
    return d + ' ' + (MONTHS[m] || '') + ' ' + parts[0];
  }


  /**
   * Адаптивные изображения: на смартфон уходит вариант 480px вместо полноразмерного.
   * Файлы -480.jpg лежат рядом с основными в assets/img/.
   */
  function srcsetFor(src) {
    var small = String(src).replace(/\.jpg$/, '-480.jpg');
    return ' srcset="' + esc(small) + ' 480w, ' + esc(src) + ' 1200w"';
  }

  var SIZES_CARD = ' sizes="(max-width: 767px) 80vw, (max-width: 1023px) 46vw, 380px"';
  var SIZES_MODAL = ' sizes="(max-width: 767px) 100vw, 740px"';


  /**
   * Кнопка-иконка «открыть» вместо текстовой ссылки «Подробнее».
   * Название элемента уходит в aria-label — кнопка остаётся понятной
   * для скринридеров и озвучки на смартфонах.
   */
  function openBtn(attr, value, label, cls) {
    return (
      '<button type="button" class="' + (cls || 'card__open') + '" data-' + attr + '="' +
      esc(value) + '" aria-label="' + esc(label) + '" title="' + esc(label) + '">' +
      icon('expand') +
      '</button>'
    );
  }

  function render(target, html) {
    var node = typeof target === 'string' ? $(target) : target;
    if (node) node.innerHTML = html;
    return node;
  }

  /* ========================================================================
     MODAL — единый компонент для всех типов окон
     ======================================================================== */

  var Modal = (function () {
    var root, dialog, titleEl, bodyEl, closeBtn;
    var lastFocused = null;
    var isOpen = false;

    function build() {
      root = document.createElement('div');
      root.className = 'modal';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-labelledby', 'modal-title');
      root.hidden = false;
      root.innerHTML =
        '<div class="modal__overlay" data-modal-close></div>' +
        '<div class="modal__dialog">' +
        '<div class="modal__head">' +
        '<h2 class="modal__title" id="modal-title"></h2>' +
        '<button type="button" class="modal__close" data-modal-close aria-label="Закрыть окно">' +
        icon('close') +
        '</button>' +
        '</div>' +
        '<div class="modal__body"></div>' +
        '</div>';
      document.body.appendChild(root);

      dialog = $('.modal__dialog', root);
      titleEl = $('.modal__title', root);
      bodyEl = $('.modal__body', root);
      closeBtn = $('.modal__close', root);

      root.addEventListener('click', function (e) {
        if (e.target.hasAttribute && e.target.hasAttribute('data-modal-close')) close();
      });
      root.addEventListener('keydown', onKeydown);

      // Подстраховка: Escape срабатывает даже если фокус ушёл за пределы окна
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen) close();
      });

      bindSwipeToClose();
    }

    /**
     * Свайп вниз закрывает bottom sheet на мобильных.
     * Жест перехватывается только если тело окна прокручено в самый верх —
     * иначе пользователь просто листает содержимое.
     */
    function bindSwipeToClose() {
      var startY = 0;
      var delta = 0;
      var active = false;

      function isSheet() {
        return window.matchMedia('(max-width: 599px)').matches;
      }

      dialog.addEventListener('touchstart', function (e) {
        if (!isSheet() || e.touches.length !== 1) return;
        if (bodyEl.scrollTop > 0) return;
        startY = e.touches[0].clientY;
        delta = 0;
        active = true;
        dialog.style.transition = 'none';
      }, { passive: true });

      dialog.addEventListener('touchmove', function (e) {
        if (!active) return;
        delta = e.touches[0].clientY - startY;
        if (delta < 0) delta = 0;
        dialog.style.transform = 'translateY(' + delta + 'px)';
      }, { passive: true });

      function endSwipe() {
        if (!active) return;
        active = false;
        dialog.style.transition = '';
        dialog.style.transform = '';
        if (delta > 110) close();
        delta = 0;
      }

      dialog.addEventListener('touchend', endSwipe);
      dialog.addEventListener('touchcancel', endSwipe);
    }

    function onKeydown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
        return;
      }
      if (e.key !== 'Tab') return;
      var focusables = $$(
        'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])',
        root
      ).filter(function (el) {
        return el.offsetParent !== null || el === document.activeElement;
      });
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    /**
     * @param {Object} opts {title, content, wide, onOpen}
     */
    function open(opts) {
      if (!root) build();
      if (!isOpen) lastFocused = document.activeElement;

      titleEl.textContent = opts.title || '';
      bodyEl.innerHTML = opts.content || '';
      root.classList.toggle('modal--wide', !!opts.wide);
      bodyEl.scrollTop = 0;

      if (!isOpen) {
        document.body.classList.add('is-locked');
        root.classList.add('is-open');
        isOpen = true;
      }

      if (typeof opts.onOpen === 'function') opts.onOpen(bodyEl);

      // фокус на первый интерактивный элемент или на кнопку закрытия
      window.requestAnimationFrame(function () {
        var focusTarget =
          $('[data-autofocus]', bodyEl) ||
          $('input, button, a[href]', bodyEl) ||
          closeBtn;
        try {
          focusTarget.focus({ preventScroll: true });
        } catch (err) {
          closeBtn.focus();
        }
      });
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      root.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      window.setTimeout(function () {
        if (!isOpen) bodyEl.innerHTML = '';
      }, 250);
      if (lastFocused && lastFocused.focus) {
        try {
          lastFocused.focus({ preventScroll: true });
        } catch (err) {}
      }
    }

    return { open: open, close: close };
  })();

  /* ========================================================================
     FORMS — единый переиспользуемый компонент формы
     ======================================================================== */

  var Forms = (function () {
    var counter = 0;

    /** Разметка формы заявки */
    function markup(opts) {
      opts = opts || {};
      counter += 1;
      var uid = 'f' + counter;
      var btnText = opts.submitText || 'Жду звонка';
      return (
        '<form class="form" novalidate data-app-form data-source="' +
        esc(opts.source || 'форма') +
        '">' +
        '<div class="field">' +
        '<label class="field__label" for="' + uid + '-name">Ваше имя</label>' +
        '<input class="field__control" type="text" id="' + uid + '-name" name="name" ' +
        'placeholder="Как к вам обращаться" autocomplete="name" required ' +
        'aria-describedby="' + uid + '-name-err">' +
        '<span class="field__error" id="' + uid + '-name-err">Укажите имя — так оператор обратится к вам корректно</span>' +
        '</div>' +
        '<div class="field">' +
        '<label class="field__label" for="' + uid + '-phone">Номер телефона</label>' +
        '<input class="field__control" type="tel" id="' + uid + '-phone" name="phone" ' +
        'placeholder="+7 (___) ___-__-__" autocomplete="tel" inputmode="tel" required ' +
        'aria-describedby="' + uid + '-phone-err">' +
        '<span class="field__error" id="' + uid + '-phone-err">Введите номер полностью — 10 цифр после +7</span>' +
        '</div>' +
        '<label class="checkbox">' +
        '<input type="checkbox" name="consent" required>' +
        '<span>' + esc(CFG.legal.consentText) +
        ' <a href="' + esc(CFG.legal.privacyUrl) + '" target="_blank" rel="noopener">Политика конфиденциальности</a></span>' +
        '</label>' +
        '<div class="form__status" role="alert"></div>' +
        '<button type="submit" class="btn btn--primary btn--block">' +
        icon('arrowRight') + '<span>' + esc(btnText) + '</span>' +
        '</button>' +
        '<p class="form__note">Нажимая кнопку, вы подтверждаете согласие на обработку персональных данных. ' +
        esc(CFG.responseTime) + '.</p>' +
        '</form>'
      );
    }

    /* ------------------------------------------------------------------
       ТЕЛЕФОН: маска +7 (XXX) XXX-XX-XX
       ------------------------------------------------------------------
       Аудитория сайта — российская, поэтому префикс +7 зафиксирован:
       его нельзя стереть, а лишние цифры отсекаются, а не ломают формат.
       ------------------------------------------------------------------ */

    var PHONE_PREFIX = '+7 ';

    /** Оставляет только цифры абонентской части (без кода страны), максимум 10 */
    function phoneSubscriber(value) {
      var digits = String(value).replace(/\D/g, '');
      if (!digits) return '';

      // Первая семёрка — это префикс поля, а не цифра номера
      if (digits.charAt(0) === '7' || digits.charAt(0) === '8') digits = digits.slice(1);

      // Вставили номер с кодом страны поверх префикса: 8 900… / 7 900…
      if (digits.length > 10 && (digits.charAt(0) === '7' || digits.charAt(0) === '8')) {
        digits = digits.slice(1);
      }

      return digits.slice(0, 10);
    }

    /** Собирает читаемый вид из абонентских цифр */
    function phoneFormat(sub) {
      var out = '+7';
      if (!sub.length) return out + ' ';
      out += ' (' + sub.slice(0, 3);
      if (sub.length >= 3) out += ')';
      if (sub.length > 3) out += ' ' + sub.slice(3, 6);
      if (sub.length > 6) out += '-' + sub.slice(6, 8);
      if (sub.length > 8) out += '-' + sub.slice(8, 10);
      return out;
    }

    /** Значение для отправки: 11 цифр в международном формате */
    function normalizePhone(value) {
      var sub = phoneSubscriber(value);
      return sub ? '+7' + sub : '';
    }

    /**
     * Номер считается корректным, только когда набран полностью.
     * Неполный номер пропускать нельзя — по нему не дозвонятся.
     */
    function isValidPhone(value) {
      var sub = phoneSubscriber(value);
      if (sub.length !== 10) return false;
      // В российской нумерации код не начинается с 0, 1 и 2
      if (!/^[3-9]/.test(sub)) return false;
      // Отсекаем заглушки вида 000-00-00-000 и 999-99-99-999
      if (/^(\d)\1{9}$/.test(sub)) return false;
      return true;
    }

    /** Сколько абонентских цифр находится левее позиции курсора */
    function subDigitsBefore(value, pos) {
      var all = value.slice(0, pos).replace(/\D/g, '').length;
      // Вычитаем семёрку префикса, если курсор стоит правее неё
      return Math.max(0, all - (pos > 1 ? 1 : 0));
    }

    /** Позиция курсора после n-й абонентской цифры */
    function caretAfterSubDigit(value, n) {
      if (n <= 0) return Math.min(PHONE_PREFIX.length, value.length);
      var seen = 0;
      var skippedPrefix = false;
      for (var i = 0; i < value.length; i += 1) {
        if (!/\d/.test(value.charAt(i))) continue;
        if (!skippedPrefix) { skippedPrefix = true; continue; } // семёрка префикса
        seen += 1;
        if (seen === n) return i + 1;
      }
      return value.length;
    }

    /** Переформатирует поле, сохраняя позицию курсора */
    function reformatPhone(input) {
      var caret = input.selectionStart;
      var target = subDigitsBefore(input.value, caret);
      var formatted = phoneFormat(phoneSubscriber(input.value));

      if (input.value !== formatted) input.value = formatted;

      var pos = caretAfterSubDigit(formatted, target);
      try {
        input.setSelectionRange(pos, pos);
      } catch (e) {
        /* поле могло потерять фокус — позиция не важна */
      }
    }

    function bindPhoneMask(input) {
      // Пустое поле показывает плейсхолдер; префикс появляется при фокусе
      input.addEventListener('focus', function () {
        if (!input.value) {
          input.value = PHONE_PREFIX;
          window.requestAnimationFrame(function () {
            try {
              input.setSelectionRange(PHONE_PREFIX.length, PHONE_PREFIX.length);
            } catch (e) {}
          });
        }
      });

      // Если пользователь ничего не ввёл — возвращаем поле в пустое состояние,
      // иначе «+7 » выглядит как заполненное поле и проходит взглядом мимо
      input.addEventListener('blur', function () {
        if (!phoneSubscriber(input.value)) input.value = '';
      });

      // Backspace через разделитель должен удалять цифру, а не «залипать»
      input.addEventListener('keydown', function (e) {
        if (e.key !== 'Backspace') return;
        if (input.selectionStart !== input.selectionEnd) return; // есть выделение
        var pos = input.selectionStart;

        if (pos <= PHONE_PREFIX.length) {
          e.preventDefault(); // префикс не удаляется
          return;
        }
        if (/\d/.test(input.value.charAt(pos - 1))) return; // слева цифра — как обычно

        var i = pos - 1;
        while (i >= PHONE_PREFIX.length && !/\d/.test(input.value.charAt(i))) i -= 1;
        e.preventDefault();
        if (i < PHONE_PREFIX.length) return;

        input.value = input.value.slice(0, i) + input.value.slice(i + 1);
        try {
          input.setSelectionRange(i, i);
        } catch (err) {}
        reformatPhone(input);
      });

      input.addEventListener('input', function () {
        reformatPhone(input);
      });
    }

    function setError(field, on) {
      var wrap = field.closest('.field') || field.closest('.checkbox');
      if (wrap) wrap.classList.toggle('has-error', on);
    }

    /** Маска ввода телефона (мягкая: не мешает вставке и иностранным номерам) */
    function bindPhoneMask(input) {
      input.addEventListener('input', function () {
        var v = input.value;
        var digits = v.replace(/\D/g, '');
        if (!digits) {
          input.value = '';
          return;
        }
        // Российский формат
        if (/^[78]/.test(digits) && digits.length <= 11) {
          digits = '7' + digits.slice(1);
          var out = '+7';
          if (digits.length > 1) out += ' (' + digits.slice(1, 4);
          if (digits.length >= 5) out += ') ' + digits.slice(4, 7);
          if (digits.length >= 8) out += '-' + digits.slice(7, 9);
          if (digits.length >= 10) out += '-' + digits.slice(9, 11);
          input.value = out;
        } else if (/^9/.test(digits) && digits.length <= 10) {
          input.value = '+7 (' + digits.slice(0, 3) +
            (digits.length > 3 ? ') ' + digits.slice(3, 6) : '') +
            (digits.length > 6 ? '-' + digits.slice(6, 8) : '') +
            (digits.length > 8 ? '-' + digits.slice(8, 10) : '');
        } else {
          input.value = '+' + digits;
        }
      });
    }

    function showSuccess(form) {
      var wrap = document.createElement('div');
      wrap.className = 'form-success';
      wrap.setAttribute('role', 'status');
      wrap.innerHTML =
        '<div class="form-success__icon">' + icon('check') + '</div>' +
        '<h3>' + esc(CFG.form.successTitle) + '</h3>' +
        '<p>' + esc(CFG.form.successText) + '</p>' +
        '<p class="form__note" style="margin-top:14px">Если вопрос срочный — позвоните: ' +
        '<a href="tel:' + esc(CFG.phone.tel) + '" style="color:var(--accent);font-weight:700">' +
        esc(CFG.phone.display) + '</a></p>';
      form.replaceWith(wrap);
    }

    /** Навешивает обработчики на форму */
    function bind(form) {
      if (!form || form.dataset.bound === '1') return;
      form.dataset.bound = '1';

      var phoneInput = form.querySelector('input[name="phone"]');
      if (phoneInput) bindPhoneMask(phoneInput);

      $$('.field__control, .checkbox input', form).forEach(function (el) {
        el.addEventListener('input', function () {
          setError(el, false);
        });
        el.addEventListener('change', function () {
          setError(el, false);
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (form.dataset.sending === '1') return; // защита от повторной отправки

        var name = form.querySelector('input[name="name"]');
        var phone = form.querySelector('input[name="phone"]');
        var consent = form.querySelector('input[name="consent"]');
        var status = form.querySelector('.form__status');
        var valid = true;

        if (!name.value.trim() || name.value.trim().length < 2) {
          setError(name, true);
          valid = false;
        }
        if (!isValidPhone(phone.value)) {
          setError(phone, true);
          valid = false;
        }
        if (!consent.checked) {
          setError(consent, true);
          valid = false;
        }

        if (!valid) {
          status.className = 'form__status is-error';
          status.textContent = 'Проверьте, пожалуйста, отмеченные поля.';
          var firstError = form.querySelector('.has-error input');
          if (firstError) firstError.focus();
          return;
        }

        status.className = 'form__status';
        status.textContent = '';

        var btn = form.querySelector('button[type="submit"]');
        btn.classList.add('is-loading');
        btn.disabled = true;
        form.dataset.sending = '1';

        var payload = {
          name: name.value.trim(),
          phone: normalizePhone(phone.value),
          source: form.dataset.source || '',
          page: location.href,
          page_title: document.title,
          sent_at: new Date().toISOString(),
        };

        // UTM-метки и источник перехода, снятые при заходе на сайт
        if (typeof window.SITE.utm === 'function') {
          var marks = window.SITE.utm();
          Object.keys(marks).forEach(function (k) {
            payload[k] = marks[k];
          });
        }

        send(payload)
          .then(function () {
            showSuccess(form);
          })
          .catch(function () {
            form.dataset.sending = '0';
            btn.classList.remove('is-loading');
            btn.disabled = false;
            status.className = 'form__status is-error';
            status.textContent =
              'Не удалось отправить заявку. Позвоните нам по телефону ' + CFG.phone.display + '.';
          });
      });
    }

    /** Отправка данных. Без endpoint работает демонстрационный режим. */
    function send(payload) {
      // Endpoint не задан — демонстрационный режим без реальной отправки
      if (!CFG.form.endpoint) {
        return new Promise(function (resolve) {
          window.setTimeout(resolve, 900);
        });
      }

      // Обрываем запрос, если сервер не отвечает: пользователь не должен
      // бесконечно смотреть на крутящийся индикатор
      var controller = typeof AbortController === 'function' ? new AbortController() : null;
      var timer = window.setTimeout(function () {
        if (controller) controller.abort();
      }, 15000);

      var opts = {
        method: CFG.form.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      };
      if (controller) opts.signal = controller.signal;

      return fetch(CFG.form.endpoint, opts).then(
        function (res) {
          window.clearTimeout(timer);
          if (!res.ok) throw new Error('Request failed: ' + res.status);
          return res;
        },
        function (err) {
          window.clearTimeout(timer);
          throw err;
        }
      );
    }

    /** Открыть модальное окно с формой */
    function openModal(opts) {
      opts = opts || {};
      Modal.open({
        title: opts.title || 'Оставьте контакты — перезвоним',
        content:
          '<p style="color:var(--fg-muted);font-size:var(--fs-sm);margin-bottom:18px">' +
          esc(
            opts.text ||
              'Специалист перезвонит и ответит на вопросы о требованиях, документах, выплатах и порядке оформления. Консультация бесплатная.'
          ) +
          '</p>' +
          markup({ source: opts.source, submitText: opts.submitText }),
        onOpen: function (body) {
          bind($('[data-app-form]', body));
          var first = $('input[name="name"]', body);
          if (first) first.setAttribute('data-autofocus', '');
        },
      });
    }

    return { markup: markup, bind: bind, openModal: openModal };
  })();

  /* ========================================================================
     CAROUSEL — на нативном scroll-snap (swipe работает из коробки)
     ======================================================================== */

  function initCarousel(root, opts) {
    opts = opts || {};
    var viewport = $('.carousel__viewport', root);
    var track = $('.carousel__track', root);
    var slides = $$('.carousel__slide', track);
    if (!viewport || !slides.length) return;

    var prev = $('[data-carousel-prev]', root);
    var next = $('[data-carousel-next]', root);
    var dotsWrap = $('.carousel__dots', root);

    function perView() {
      var vw = viewport.clientWidth;
      var sw = slides[0].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return Math.max(1, Math.round((vw + gap) / (sw + gap)));
    }

    function pageCount() {
      return Math.max(1, slides.length - perView() + 1);
    }

    function currentIndex() {
      var sw = slides[0].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      return Math.round(viewport.scrollLeft / (sw + gap));
    }

    function scrollToIndex(i) {
      var sw = slides[0].getBoundingClientRect().width;
      var gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap) || 0;
      viewport.scrollTo({ left: i * (sw + gap), behavior: 'smooth' });
    }

    function buildDots() {
      if (!dotsWrap) return;
      var n = pageCount();
      var html = '';
      for (var i = 0; i < n; i += 1) {
        html +=
          '<button type="button" class="carousel__dot" data-dot="' + i +
          '" aria-label="Перейти к слайду ' + (i + 1) + '"></button>';
      }
      dotsWrap.innerHTML = html;
    }

    function update() {
      var i = currentIndex();
      var max = pageCount() - 1;
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i >= max;
      if (dotsWrap) {
        $$('.carousel__dot', dotsWrap).forEach(function (d, idx) {
          var active = idx === Math.min(i, max);
          d.classList.toggle('is-active', active);
          d.setAttribute('aria-current', active ? 'true' : 'false');
        });
      }
    }

    function step(dir) {
      var i = currentIndex() + dir;
      var max = pageCount() - 1;
      if (i < 0) i = 0;
      if (i > max) i = max;
      scrollToIndex(i);
    }

    if (prev) prev.addEventListener('click', function () { step(-1); });
    if (next) next.addEventListener('click', function () { step(1); });

    if (dotsWrap) {
      dotsWrap.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-dot]');
        if (!btn) return;
        scrollToIndex(parseInt(btn.getAttribute('data-dot'), 10));
      });
    }

    var scrollTimer;
    viewport.addEventListener('scroll', function () {
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(update, 90);
    }, { passive: true });

    var resizeTimer;
    window.addEventListener('resize', function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        buildDots();
        update();
      }, 180);
    });

    buildDots();
    update();
  }

  /** Обёртка разметки слайдера */
  function carouselMarkup(id, slidesHtml, opts) {
    opts = opts || {};
    return (
      '<div class="carousel" id="' + id + '" role="region" aria-roledescription="карусель" aria-label="' +
      esc(opts.label || 'Слайдер') + '">' +
      '<div class="carousel__viewport" tabindex="0">' +
      '<div class="carousel__track">' + slidesHtml + '</div>' +
      '</div>' +
      '<div class="carousel__controls">' +
      '<div class="carousel__dots"></div>' +
      '<div class="carousel__arrows">' +
      '<button type="button" class="carousel__arrow" data-carousel-prev aria-label="Предыдущий слайд">' +
      icon('chevronLeft') + '</button>' +
      '<button type="button" class="carousel__arrow" data-carousel-next aria-label="Следующий слайд">' +
      icon('chevronRight') + '</button>' +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  /* ========================================================================
     РЕНДЕР СЕКЦИЙ
     ======================================================================== */

  /* --- Преимущества --- */
  function renderAdvantages() {
    var slides = DATA.advantages
      .map(function (a) {
        return (
          '<div class="carousel__slide"><article class="card">' +
          '<div class="card__icon">' + icon(a.icon) + '</div>' +
          '<h3 class="card__title">' + esc(a.title) + '</h3>' +
          '<p class="card__text">' + esc(a.text) + '</p>' +
          '</article></div>'
        );
      })
      .join('');
    render('#advantages-carousel', carouselMarkup('c-advantages', slides, {
      label: 'Преимущества обращения',
    }));
    initCarousel($('#c-advantages'));
  }

  /* --- Требования --- */
  function renderRequirements() {
    var html = DATA.requirements
      .map(function (r) {
        return (
          '<article class="card">' +
          '<div class="card__icon">' + icon(r.icon) + '</div>' +
          '<h3 class="card__title">' + esc(r.title) + '</h3>' +
          '<p class="card__text">' + esc(r.text) + '</p>' +
          '</article>'
        );
      })
      .join('');
    render('#requirements-grid', html);
  }

  /* --- Специальности --- */
  function renderSpecialties() {
    var html = DATA.specialties
      .map(function (s) {
        return (
          '<article class="card spec-card card--clickable" data-specialty="' + esc(s.id) + '">' +
          '<div class="card__icon">' + icon(s.icon) + '</div>' +
          '<h3 class="card__title">' + esc(s.title) + '</h3>' +
          '<p class="card__text">' + esc(s.short) + '</p>' +
          openBtn('specialty', s.id, 'Открыть описание специальности: ' + s.title) +
          '</article>'
        );
      })
      .join('');
    render('#specialties-grid', html);
  }

  function openSpecialty(id) {
    var s = DATA.specialties.filter(function (x) { return x.id === id; })[0];
    if (!s) return;
    var reqs = (s.reqs || [])
      .map(function (r) { return '<li>' + icon('check') + '<span>' + esc(r) + '</span></li>'; })
      .join('');
    Modal.open({
      title: s.title,
      content:
        '<span class="modal__badge">Военная специальность</span>' +
        '<p>' + esc(s.full) + '</p>' +
        (reqs ? '<h3>Что учитывается</h3><ul class="modal__reqs">' + reqs + '</ul>' : '') +
        '<div class="note note--info" style="margin-top:18px">' + icon('info') +
        '<span>Набор по конкретной должности зависит от региона и потребности в специалистах. ' +
        'Актуальные вакансии уточняйте в пункте отбора.</span></div>' +
        '<div class="modal__foot">' +
        '<button type="button" class="btn btn--primary" data-open-form data-source="Специальность: ' +
        esc(s.title) + '">Записаться на приём</button>' +
        '<a class="btn btn--outline" href="tel:' + esc(CFG.phone.tel) + '">' +
        icon('phone') + 'Позвонить</a>' +
        '</div>',
    });
  }

  /* --- Ключевые цифры по выплатам (акцентный блок) --- */
  function renderPaymentHighlights() {
    var html = DATA.paymentHighlights
      .map(function (h) {
        return (
          '<div class="pay-hero__item' + (h.feature ? ' pay-hero__item--feature' : '') + '">' +
          '<span class="pay-hero__icon">' + icon(h.icon) + '</span>' +
          '<span class="pay-hero__value">' + esc(h.value) + '</span>' +
          '<span class="pay-hero__label">' + esc(h.label) + '</span>' +
          (h.note ? '<span class="pay-hero__note">' + esc(h.note) + '</span>' : '') +
          '</div>'
        );
      })
      .join('');
    render('#payments-highlights', html);
  }

  /* --- Дополнительные выплаты (сетка сумм) --- */
  function renderExtraPayments() {
    var html = DATA.extraPayments
      .map(function (e) {
        return (
          '<article class="payout' + (e.feature ? ' payout--feature' : '') + '">' +
          '<span class="payout__icon">' + icon(e.icon) + '</span>' +
          '<span class="payout__value">' + esc(e.value) + '</span>' +
          '<span class="payout__label">' + esc(e.label) + '</span>' +
          (e.note ? '<span class="payout__note">' + esc(e.note) + '</span>' : '') +
          '</article>'
        );
      })
      .join('');
    render('#extra-payments-grid', html);
  }

  /* --- Выплаты --- */
  function renderPayments() {
    var html = DATA.payments
      .map(function (p) {
        var amount = p.amount
          ? '<div class="pay-card__amount">' + esc(p.amount) + '</div>'
          : '<div class="pay-card__amount--empty">' + icon('info') +
            '<span>Размер уточняется</span></div>';
        return (
          '<article class="card pay-card">' +
          '<div class="card__icon">' + icon(p.icon) + '</div>' +
          '<h3 class="card__title">' + esc(p.title) + '</h3>' +
          amount +
          '<p class="card__text">' + esc(p.text) + '</p>' +
          (p.note ? '<p class="card__note">' + esc(p.note) + '</p>' : '') +
          '</article>'
        );
      })
      .join('');
    render('#payments-grid', html);
  }

  /* --- Льготы --- */
  function renderBenefits() {
    var html = DATA.benefits
      .map(function (b) {
        return (
          '<article class="card card--clickable" data-benefit="' + esc(b.id) + '">' +
          '<div class="card__icon">' + icon(b.icon) + '</div>' +
          '<h3 class="card__title">' + esc(b.title) + '</h3>' +
          '<p class="card__text">' + esc(b.short) + '</p>' +
          openBtn('benefit', b.id, 'Открыть описание: ' + b.title) +
          '</article>'
        );
      })
      .join('');
    render('#benefits-grid', html);
  }

  function openBenefit(id) {
    var b = DATA.benefits.filter(function (x) { return x.id === id; })[0];
    if (!b) return;
    Modal.open({
      title: b.title,
      content:
        '<span class="modal__badge">Гарантии государства</span>' +
        '<p>' + b.full + '</p>' +
        '<div class="note" style="margin-top:18px">' + icon('alert') +
        '<span>Условия и размеры мер поддержки периодически обновляются. ' +
        'Актуальные сведения проверяйте по официальным источникам и в органах социальной защиты вашего региона.</span></div>' +
        '<div class="modal__foot">' +
        '<button type="button" class="btn btn--primary" data-open-form data-source="Льготы: ' +
        esc(b.title) + '">Уточнить у специалиста</button>' +
        '<a class="btn btn--outline" href="#official">Официальные источники</a>' +
        '</div>',
    });
  }

  /* --- Пункты отбора --- */
  /**
   * Пункты отбора: аккордеоны по федеральным округам + плитки городов.
   * Точные адреса не публикуются — карточка города ведёт на поиск по картам
   * и предлагает связаться с оператором.
   */
  function renderOffices() {
    var html = DATA.offices
      .map(function (d, i) {
        var cities = d.cities
          .map(function (city) {
            return (
              '<button type="button" class="city" data-city="' + esc(city) +
              '" data-district="' + esc(d.district) + '">' +
              '<span>' + esc(city) + '</span>' +
              icon('chevronRight', 'city__chev') +
              '</button>'
            );
          })
          .join('');

        return (
          '<section class="district' + (i === 0 ? ' is-open' : '') + '" data-district-id="' + esc(d.id) + '">' +
          '<button type="button" class="district__head" aria-expanded="' + (i === 0 ? 'true' : 'false') +
          '" aria-controls="d-' + esc(d.id) + '">' +
          '<span class="district__badge">' + esc(d.short) + '</span>' +
          '<span class="district__name">' + esc(d.district) + '</span>' +
          '<span class="district__count">' + d.cities.length + '</span>' +
          '<span class="district__chev">' + icon('chevronDown') + '</span>' +
          '</button>' +
          '<div class="district__body" id="d-' + esc(d.id) + '">' +
          '<div class="city-grid">' + cities + '</div>' +
          '</div>' +
          '</section>'
        );
      })
      .join('');

    render('#offices-list', html);

    var total = DATA.offices.reduce(function (a, d) { return a + d.cities.length; }, 0);
    var counter = $('#offices-total');
    if (counter) counter.textContent = total;

    renderMap();
    bindOfficeFilter();
  }

  /** Живой поиск города по всем округам */
  function bindOfficeFilter() {
    var input = $('#office-filter');
    if (!input || input.dataset.bound === '1') return;
    input.dataset.bound = '1';

    var empty = $('#offices-empty');

    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase().replace(/ё/g, 'е');
      var found = 0;

      $$('.district').forEach(function (district) {
        var visibleInDistrict = 0;

        $$('.city', district).forEach(function (btn) {
          var name = btn.getAttribute('data-city').toLowerCase().replace(/ё/g, 'е');
          var match = !q || name.indexOf(q) !== -1;
          btn.hidden = !match;
          if (match) visibleInDistrict += 1;
        });

        district.hidden = visibleInDistrict === 0;
        found += visibleInDistrict;

        // При поиске раскрываем округа с совпадениями
        if (q) {
          district.classList.toggle('is-open', visibleInDistrict > 0);
          var head = $('.district__head', district);
          if (head) head.setAttribute('aria-expanded', visibleInDistrict > 0 ? 'true' : 'false');
        }
      });

      if (empty) empty.hidden = found !== 0;
    });
  }

  /** Карточка города */
  function openCity(city, district) {
    var mapUrl =
      'https://yandex.ru/maps/?text=' +
      encodeURIComponent('пункт отбора на военную службу по контракту ' + city);

    Modal.open({
      title: city,
      content:
        '<span class="modal__badge">' + esc(district) + '</span>' +
        '<p>Пункт отбора на военную службу по контракту в городе ' + esc(city) +
        ' принимает кандидатов: проводит собеседование, принимает документы ' +
        'и направляет на медицинскую комиссию.</p>' +
        '<h3>Как обратиться</h3>' +
        '<ul class="modal__reqs">' +
        '<li>' + icon('phone') + '<span>Позвоните нам — подскажем точный адрес, время работы ' +
        'и порядок записи: <a href="tel:' + esc(CFG.phone.tel) +
        '" style="color:var(--accent-text);font-weight:700">' + esc(CFG.phone.display) + '</a></span></li>' +
        '<li>' + icon('doc') + '<span>Возьмите паспорт, военный билет, ИНН и документы об образовании</span></li>' +
        '<li>' + icon('clock') + '<span>Перед визитом уточните режим работы: в разных регионах он отличается</span></li>' +
        '</ul>' +
        '<div class="note note--info" style="margin-top:18px">' + icon('info') +
        '<span>Адреса пунктов отбора меняются, поэтому мы не публикуем их списком — ' +
        'актуальный адрес по вашему городу назовёт оператор.</span></div>' +
        '<div class="modal__foot">' +
        '<button type="button" class="btn btn--primary" data-open-form data-source="Город: ' +
        esc(city) + '">Записаться в этот пункт</button>' +
        '<a class="btn btn--outline" href="' + esc(mapUrl) + '" target="_blank" rel="noopener">' +
        icon('route') + 'Открыть на карте</a>' +
        '</div>',
    });
  }

  /* --- Карта --- */
  function renderMap(city) {
    var root = $('#map-root');
    if (!root) return;

    var query = city
      ? 'пункт отбора на военную службу по контракту ' + city
      : 'пункт отбора на военную службу по контракту';

    var src =
      'https://yandex.ru/map-widget/v1/?text=' + encodeURIComponent(query) +
      (city ? '&z=11' : '&ll=55.0%2C60.0&z=3');

    var fallback =
      '<div class="map__fallback">' +
      '<div class="map__pin">' + icon('mappin') + '</div>' +
      '<div class="map__addr">Пункты отбора работают во всех регионах России</div>' +
      '<a class="btn btn--primary btn--sm" href="https://yandex.ru/maps/?text=' +
      encodeURIComponent(query) + '" target="_blank" rel="noopener">' +
      icon('route') + 'Найти на карте</a>' +
      '<p style="font-size:var(--fs-xs);color:rgba(255,255,255,.6);max-width:320px;margin:0 auto">' +
      'Не удалось загрузить карту. Откройте поиск в новой вкладке или позвоните нам.</p>' +
      '</div>';

    root.innerHTML =
      '<iframe src="' + src + '" loading="lazy" title="Карта: пункты отбора на военную службу" ' +
      'allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>';

    var frame = $('iframe', root);
    if (frame) {
      frame.addEventListener('error', function () {
        root.innerHTML = fallback;
      });
    }
  }

  /* --- Порядок оформления --- */
  function renderProcess() {
    var html = DATA.process
      .map(function (s) {
        return (
          '<article class="step">' +
          '<div class="step__num">' + s.step + '</div>' +
          '<div><h3 class="step__title">' + esc(s.title) + '</h3>' +
          '<p class="step__text">' + esc(s.text) + '</p></div>' +
          '</article>'
        );
      })
      .join('');
    render('#process-steps', html);
  }

  /* --- Обучение --- */
  function renderTraining() {
    var html = DATA.training
      .map(function (t) {
        return (
          '<article class="card">' +
          '<div class="card__icon">' + icon(t.icon) + '</div>' +
          '<h3 class="card__title">' + esc(t.title) + '</h3>' +
          '<p class="card__text">' + esc(t.text) + '</p>' +
          '</article>'
        );
      })
      .join('');
    render('#training-grid', html);
  }

  /* --- Документы --- */
  function renderDocuments() {
    var html = DATA.documents.main
      .map(function (d) {
        return (
          '<li><span class="checklist__check">' + icon('check') + '</span>' +
          '<span><span class="checklist__title">' + esc(d.title) + '</span>' +
          '<span class="checklist__note">' + esc(d.note) + '</span></span></li>'
        );
      })
      .join('');
    render('#documents-list', html);
  }

  function openDocuments() {
    function list(items) {
      return items
        .map(function (d) {
          return '<li>' + icon('check') + '<span><strong>' + esc(d.title) + '</strong><br>' +
            '<span style="font-size:var(--fs-sm)">' + esc(d.note) + '</span></span></li>';
        })
        .join('');
    }
    Modal.open({
      wide: true,
      title: 'Полный список документов',
      content:
        '<h3>Основной пакет</h3>' +
        '<ul class="modal__reqs">' + list(DATA.documents.main) + '</ul>' +
        '<h3>Дополнительные документы</h3>' +
        '<ul class="modal__reqs">' + list(DATA.documents.extra) + '</ul>' +
        '<div class="note" style="margin-top:20px">' + icon('alert') +
        '<span>' + esc(DATA.documents.disclaimer) + '</span></div>' +
        '<div class="modal__foot">' +
        '<button type="button" class="btn btn--primary" data-open-form data-source="Список документов">' +
        'Уточнить список для меня</button>' +
        '<a class="btn btn--outline" href="tel:' + esc(CFG.phone.tel) + '">' + icon('phone') + 'Позвонить</a>' +
        '</div>',
    });
  }

  /* --- Блок доверия --- */
  function renderTrust() {
    var html = DATA.trust
      .map(function (t) {
        return (
          '<article class="card">' +
          '<div class="card__icon">' + icon(t.icon) + '</div>' +
          '<h3 class="card__title">' + esc(t.title) + '</h3>' +
          '<p class="card__text">' + esc(t.text) + '</p>' +
          '</article>'
        );
      })
      .join('');
    render('#trust-grid', html);
  }

  /* --- Отзывы --- */
  function renderReviews() {
    var slides = DATA.reviews
      .map(function (r) {
        var stars = '';
        for (var i = 1; i <= 5; i += 1) {
          stars += '<span' + (i > r.rating ? ' class="is-empty"' : '') + '>' + icon('star') + '</span>';
        }
        return (
          '<div class="carousel__slide"><article class="review">' +
          '<div class="review__stars" aria-label="Оценка: ' + r.rating + ' из 5">' + stars + '</div>' +
          '<p class="review__text">' + esc(r.text) + '</p>' +
          '<div class="review__foot">' +
          '<div class="review__avatar" aria-hidden="true">' + esc(r.name.charAt(0)) + '</div>' +
          '<div><div class="review__name">' + esc(r.name) + '</div>' +
          '<div class="review__meta">' + esc(r.city) + ' · ' + formatDate(r.date) + '</div>' +
          '<div class="review__meta">' + esc(r.status) + '</div></div>' +
          '</div></article></div>'
        );
      })
      .join('');
    render('#reviews-carousel', carouselMarkup('c-reviews', slides, {
      label: 'Отзывы обратившихся',
    }));
    initCarousel($('#c-reviews'));
  }

  /* --- Новости --- */
  function renderNews() {
    var slides = DATA.news
      .map(function (n) {
        return (
          '<div class="carousel__slide">' +
          '<article class="post post--clickable" data-news="' + esc(n.id) + '">' +
          '<div class="post__img">' +
          '<img src="' + esc(n.image) + '"' + srcsetFor(n.image) + SIZES_CARD +
          ' alt="' + esc(n.alt) + '" loading="lazy" decoding="async" width="800" height="500">' +
          '<span class="post__cat">' + esc(n.category) + '</span>' +
          '</div>' +
          '<div class="post__body">' +
          '<div class="post__meta"><span>' + icon('calendar') + formatDate(n.date) + '</span></div>' +
          '<h3 class="post__title">' + esc(n.title) + '</h3>' +
          '<p class="post__excerpt">' + esc(n.excerpt) + '</p>' +
          '</div>' +
          openBtn('news', n.id, 'Читать материал: ' + n.title, 'post__open') +
          '</article></div>'
        );
      })
      .join('');
    render('#news-carousel', carouselMarkup('c-news', slides, { label: 'Новости и материалы' }));
    initCarousel($('#c-news'));
  }

  function openNews(id) {
    var n = DATA.news.filter(function (x) { return x.id === id; })[0];
    if (!n) return;
    var related = (n.related || [])
      .map(function (rid) {
        var r = DATA.news.filter(function (x) { return x.id === rid; })[0];
        if (!r) return '';
        return '<button type="button" class="modal__related-item" data-news="' + esc(r.id) + '">' +
          icon('arrowRight') + '<span>' + esc(r.title) + '</span></button>';
      })
      .join('');
    Modal.open({
      wide: true,
      title: n.title,
      content:
        '<img class="modal__img" src="' + esc(n.image) + '"' + srcsetFor(n.image) + SIZES_MODAL +
        ' alt="' + esc(n.alt) + '" loading="lazy" decoding="async" width="800" height="450">' +
        '<div class="modal__meta">' +
        '<span>' + icon('calendar') + formatDate(n.date) + '</span>' +
        '<span>' + icon('list') + esc(n.category) + '</span>' +
        '</div>' +
        n.body +
        (DATA.newsAreDemo
          ? '<div class="note note--info" style="margin-top:18px">' + icon('info') +
            '<span>Информационный материал редакции сайта. Юридически значимые сведения проверяйте по официальным источникам.</span></div>'
          : '') +
        (related
          ? '<div class="modal__related"><div class="modal__related-title">Связанные материалы</div>' +
            '<div class="modal__related-list">' + related + '</div></div>'
          : '') +
        '<div class="modal__foot">' +
        '<button type="button" class="btn btn--primary" data-open-form data-source="Новость: ' +
        esc(n.title) + '">Спросить специалиста</button>' +
        '<a class="btn btn--outline" href="tel:' + esc(CFG.phone.tel) + '">' + icon('phone') + 'Позвонить</a>' +
        '</div>',
    });
  }

  /* --- Статьи --- */
  var ARTICLES_STEP = 6;
  var articlesShown = ARTICLES_STEP;

  function renderArticles() {
    var list = DATA.articles.slice(0, articlesShown);
    var html = list
      .map(function (a) {
        return (
          '<article class="post post--clickable" data-article="' + esc(a.id) + '">' +
          '<div class="post__img">' +
          '<img src="' + esc(a.image) + '"' + srcsetFor(a.image) + SIZES_CARD +
          ' alt="' + esc(a.alt) + '" loading="lazy" decoding="async" width="800" height="500">' +
          '<span class="post__cat">' + esc(a.category) + '</span>' +
          '</div>' +
          '<div class="post__body">' +
          '<div class="post__meta">' +
          '<span>' + icon('calendar') + formatDate(a.date) + '</span>' +
          '<span>' + icon('clock') + esc(a.readTime) + '</span>' +
          '</div>' +
          '<h3 class="post__title">' + esc(a.title) + '</h3>' +
          '<p class="post__excerpt">' + esc(a.excerpt) + '</p>' +
          '</div>' +
          openBtn('article', a.id, 'Читать статью: ' + a.title, 'post__open') +
          '</article>'
        );
      })
      .join('');
    render('#articles-grid', html);

    var moreWrap = $('#articles-more');
    if (moreWrap) {
      moreWrap.style.display = articlesShown >= DATA.articles.length ? 'none' : 'flex';
    }
  }


  /**
   * Подводит к первой из только что добавленных статей.
   *
   * Ниже 767px (а также на десктопе при увеличении масштаба страницы)
   * список статей превращается в горизонтальную ленту. Новые карточки
   * дописываются справа, за пределами экрана, и пользователю кажется,
   * что кнопка «Показать ещё» ничего не сделала.
   */
  function revealNewArticles(shownBefore) {
    var grid = $('#articles-grid');
    if (!grid) return;

    var cards = $$('.post', grid);
    var first = cards[shownBefore];
    if (!first) return;

    var horizontal = window.getComputedStyle(grid).overflowX === 'auto';

    window.requestAnimationFrame(function () {
      if (horizontal) {
        var delta = first.getBoundingClientRect().left - grid.getBoundingClientRect().left;
        grid.scrollTo({ left: grid.scrollLeft + delta - 12, behavior: 'smooth' });
      } else {
        first.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    });
  }

  function openArticle(id) {
    var a = DATA.articles.filter(function (x) { return x.id === id; })[0];
    if (!a) return;
    var related = (a.related || [])
      .map(function (rid) {
        var r = DATA.articles.filter(function (x) { return x.id === rid; })[0];
        if (!r) return '';
        return '<button type="button" class="modal__related-item" data-article="' + esc(r.id) + '">' +
          icon('arrowRight') + '<span>' + esc(r.title) + '</span></button>';
      })
      .join('');
    Modal.open({
      wide: true,
      title: a.title,
      content:
        '<img class="modal__img" src="' + esc(a.image) + '"' + srcsetFor(a.image) + SIZES_MODAL +
        ' alt="' + esc(a.alt) + '" loading="lazy" decoding="async" width="800" height="450">' +
        '<div class="modal__meta">' +
        '<span>' + icon('list') + esc(a.category) + '</span>' +
        '<span>' + icon('calendar') + formatDate(a.date) + '</span>' +
        '<span>' + icon('clock') + esc(a.readTime) + '</span>' +
        '</div>' +
        a.body +
        (related
          ? '<div class="modal__related"><div class="modal__related-title">Читайте также</div>' +
            '<div class="modal__related-list">' + related + '</div></div>'
          : '') +
        '<div class="modal__foot">' +
        '<button type="button" class="btn btn--primary" data-open-form data-source="Статья: ' +
        esc(a.title) + '">Задать вопрос</button>' +
        '<a class="btn btn--outline" href="tel:' + esc(CFG.phone.tel) + '">' + icon('phone') + 'Позвонить</a>' +
        '</div>',
    });
  }

  /* --- FAQ --- */
  /**
   * FAQ выводится так, чтобы ответы всегда присутствовали в DOM —
   * это важно для индексации и совпадает с разметкой FAQPage.
   * На мобильных пункт работает как аккордеон, на десктопе открывает модальное окно.
   */
  function renderFaq() {
    var html = DATA.faq
      .map(function (f) {
        var aid = 'a-' + f.id;
        return (
          '<div class="faq-item-wrap' + (f.primary ? '' : ' is-hidden') +
          '" data-extra="' + (f.primary ? '0' : '1') + '">' +
          '<button type="button" class="faq-item" data-faq="' + esc(f.id) + '" ' +
          'aria-expanded="false" aria-controls="' + aid + '">' +
          '<span class="faq-item__q">' + esc(f.q) + '</span>' +
          '<span class="faq-item__icon">' + icon('plus') + '</span>' +
          '</button>' +
          '<div class="faq-answer" id="' + aid + '"><div class="faq-answer__inner">' +
          f.a +
          '</div></div>' +
          '</div>'
        );
      })
      .join('');
    render('#faq-list', html);
  }

  function isMobileView() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  /** Аккордеон FAQ для мобильной версии */
  function toggleFaqAccordion(btn) {
    var wrap = btn.closest('.faq-item-wrap');
    if (!wrap) return;
    var open = wrap.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function openFaq(id) {
    var f = DATA.faq.filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    Modal.open({
      title: f.q,
      content:
        f.a +
        '<div class="modal__foot">' +
        '<button type="button" class="btn btn--primary" data-open-form data-source="FAQ: ' +
        esc(f.q) + '">Остались вопросы?</button>' +
        '<a class="btn btn--outline" href="tel:' + esc(CFG.phone.tel) + '">' + icon('phone') + 'Позвонить</a>' +
        '</div>',
    });
  }

  /* --- Теги --- */
  function renderTags() {
    var html = DATA.tags
      .map(function (t, i) {
        return '<a class="tag' + (i % 4 === 0 ? ' tag--lg' : '') + '" href="' + esc(t.target) + '">' +
          esc(t.label) + '</a>';
      })
      .join('');
    render('#tags-cloud', html);

    var count = $('#tags-count');
    if (count) count.textContent = DATA.tags.length;
  }

  /** Облако тем свёрнуто по умолчанию — раскрывается по кнопке */
  function initTopics() {
    var toggle = $('#tags-toggle');
    var body = $('#tags-cloud-wrap');
    if (!toggle || !body) return;

    toggle.addEventListener('click', function () {
      var opened = body.classList.toggle('is-open');
      toggle.classList.toggle('is-open', opened);
      toggle.setAttribute('aria-expanded', opened ? 'true' : 'false');
    });
  }

  /* --- Официальные источники --- */
  function renderOfficial() {
    var html = CFG.officialSources
      .map(function (s) {
        return (
          '<a class="official-item" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow">' +
          '<span class="official-item__icon">' + icon('shield') + '</span>' +
          '<span><span class="official-item__title">' + esc(s.title) + icon('external') + '</span>' +
          '<span class="official-item__text">' + esc(s.description) + '</span></span>' +
          '</a>'
        );
      })
      .join('');
    render('#official-list', html);
  }


  /* ========================================================================
     СОЦИАЛЬНЫЕ СЕТИ И МЕССЕНДЖЕРЫ
     Один источник — config.social. Разметка нигде не дублируется.
     ======================================================================== */

  var SOCIALS = [
    { key: 'telegram', icon: 'telegram', cls: 'tg', name: 'Telegram', label: 'Наш канал в Telegram', hint: 'Новости и ответы на вопросы' },
    { key: 'vk', icon: 'vk', cls: 'vk', name: 'ВКонтакте', label: 'Наша страница ВКонтакте', hint: 'Сообщество и обсуждения' },
    { key: 'max', icon: 'max', cls: 'max', name: 'MAX', label: 'Написать в мессенджер MAX', hint: 'Российский мессенджер' },
    { key: 'whatsapp', icon: 'whatsapp', cls: 'wa', name: 'WhatsApp', label: 'Написать в WhatsApp', hint: null },
    { key: 'manager', icon: 'manager', cls: 'tg', name: 'Менеджер в Telegram', label: 'Написать менеджеру в Telegram', hint: null },
  ];

  function socialList() {
    return SOCIALS.filter(function (s) { return !!CFG.social[s.key]; });
  }

  /** Компактный ряд иконок */
  function renderSocialRows() {
    var html = socialList()
      .map(function (s) {
        return (
          '<a class="social-btn social-btn--' + s.cls + '" href="' + esc(CFG.social[s.key]) +
          '" target="_blank" rel="noopener" aria-label="' + esc(s.label) +
          '" title="' + esc(s.name) + '">' + icon(s.icon) + '</a>'
        );
      })
      .join('');
    $$('[data-social-row]').forEach(function (el) { el.innerHTML = html; });
  }

  /** Развёрнутый список в секции контактов */
  function renderSocialList() {
    var host = $('#contacts-social');
    if (!host) return;

    var html = socialList()
      .map(function (s) {
        var hint = s.hint;
        if (s.key === 'manager') hint = CFG.social.managerHandle || 'Личный контакт';
        if (s.key === 'whatsapp') hint = CFG.social.whatsappPhone || null;
        return (
          '<a class="messenger messenger--' + s.cls + '" href="' + esc(CFG.social[s.key]) +
          '" target="_blank" rel="noopener">' +
          '<span class="messenger__icon">' + icon(s.icon) + '</span>' +
          '<span class="messenger__text">' +
          '<span class="messenger__name">' + esc(s.name) + '</span>' +
          (hint ? '<span class="messenger__hint">' + esc(hint) + '</span>' : '') +
          '</span>' +
          icon('arrowRight', 'messenger__arrow') +
          '</a>'
        );
      })
      .join('');
    host.innerHTML = html;
  }

  /* ========================================================================
     КОНТАКТНЫЕ ДАННЫЕ ИЗ КОНФИГА
     ======================================================================== */

  function applyConfig() {
    $$('[data-phone-link]').forEach(function (el) {
      el.setAttribute('href', 'tel:' + CFG.phone.tel);
    });
    $$('[data-phone-text]').forEach(function (el) {
      el.textContent = CFG.phone.display;
    });
    $$('[data-email-link]').forEach(function (el) {
      el.setAttribute('href', 'mailto:' + CFG.email);
      if (el.hasAttribute('data-email-text')) el.textContent = CFG.email;
    });
    $$('[data-hours]').forEach(function (el) {
      el.textContent = CFG.workingHours;
    });
    $$('[data-address]').forEach(function (el) {
      el.textContent = CFG.address.full;
    });
    $$('[data-social]').forEach(function (el) {
      var key = el.getAttribute('data-social');
      if (CFG.social[key]) el.setAttribute('href', CFG.social[key]);
    });
    $$('[data-privacy-link]').forEach(function (el) {
      el.setAttribute('href', CFG.legal.privacyUrl);
    });
    $$('[data-org-name]').forEach(function (el) {
      el.textContent = CFG.orgShortName;
    });
    $$('[data-year]').forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ========================================================================
     НАВИГАЦИЯ, МЕНЮ, ПРОКРУТКА
     ======================================================================== */

  function initHeader() {
    var header = $('.header');
    var menu = $('#mobile-menu');
    var burger = $('#burger');
    var mobileBar = $('#mobile-bar');
    var floating = $('#floating');
    var lastY = 0;

    function onScroll() {
      var y = window.pageYOffset;
      header.classList.toggle('is-scrolled', y > 20);
      if (mobileBar) mobileBar.classList.toggle('is-visible', y > 420);
      if (floating) floating.classList.toggle('is-visible', y > 600);
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* --- Мобильное меню --- */
    function openMenu() {
      menu.classList.add('is-open');
      document.body.classList.add('is-locked');
      burger.setAttribute('aria-expanded', 'true');
      var closeBtn = $('.mobile-menu__close', menu);
      if (closeBtn) closeBtn.focus();
    }
    function closeMenu() {
      menu.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      burger.setAttribute('aria-expanded', 'false');
    }
    if (burger) burger.addEventListener('click', openMenu);
    if (menu) {
      menu.addEventListener('click', function (e) {
        if (e.target.closest('[data-menu-close]') || e.target.classList.contains('mobile-menu__overlay')) {
          closeMenu();
        }
        if (e.target.closest('.mobile-menu__nav a')) closeMenu();
        // Кнопка заявки внутри меню: закрываем панель, модальное окно откроет делегат
        if (e.target.closest('[data-open-form]')) closeMenu();
      });
      menu.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
      });
    }

    /* --- Подсветка активного пункта меню --- */
    var navLinks = $$('.nav a[href^="#"]');
    var sections = navLinks
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      var spy = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            navLinks.forEach(function (a) {
              a.classList.toggle('is-active', a.getAttribute('href') === '#' + entry.target.id);
            });
          });
        },
        { rootMargin: '-45% 0px -50% 0px' }
      );
      sections.forEach(function (s) { spy.observe(s); });
    }
  }

  /* --- Анимация появления --- */
  function initReveal() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.05 }
    );
    items.forEach(function (el) { io.observe(el); });
  }

  /* --- Подсказка о горизонтальном свайпе (видна только на мобильных) --- */
  function initScrollHints() {
    $$('.scroll-mobile').forEach(function (el) {
      var prev = el.previousElementSibling;
      if (prev && prev.classList.contains('scroll-hint')) return;
      var hint = document.createElement('div');
      hint.className = 'scroll-hint';
      hint.setAttribute('aria-hidden', 'true'); // дублирует визуальную подсказку
      hint.innerHTML = '<span>Листайте вбок</span>' + icon('arrowRight');
      el.parentNode.insertBefore(hint, el);
    });
  }

  /* --- Раскрывающийся SEO-текст --- */
  function initCollapsible() {
    $$('[data-collapsible]').forEach(function (btn) {
      var target = document.getElementById(btn.getAttribute('data-collapsible'));
      if (!target) return;
      // Вводный абзац в свёрнутом виде обрезается по строкам
      var lead = document.getElementById(btn.getAttribute('data-collapsible-lead') || '');

      btn.addEventListener('click', function () {
        var collapsed = target.classList.toggle('is-collapsed');
        if (lead) lead.classList.toggle('is-clamped', collapsed);
        btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        btn.querySelector('span').textContent = collapsed ? 'Читать полностью' : 'Свернуть текст';
        if (collapsed) {
          var head = btn.closest('.seo-text') || target;
          head.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ========================================================================
     ГЛОБАЛЬНЫЙ ОБРАБОТЧИК КЛИКОВ (делегирование)
     ======================================================================== */

  function initDelegation() {
    document.addEventListener('click', function (e) {
      var t = e.target;

      var formBtn = t.closest('[data-open-form]');
      if (formBtn) {
        e.preventDefault();
        Forms.openModal({
          source: formBtn.getAttribute('data-source') || 'Кнопка на странице',
          title: formBtn.getAttribute('data-form-title') || undefined,
        });
        return;
      }

      var spec = t.closest('[data-specialty]');
      if (spec) { openSpecialty(spec.getAttribute('data-specialty')); return; }

      var ben = t.closest('[data-benefit]');
      if (ben) { openBenefit(ben.getAttribute('data-benefit')); return; }

      // Округ — раскрывается/сворачивается
      var dHead = t.closest('.district__head');
      if (dHead) {
        var district = dHead.closest('.district');
        var opened = district.classList.toggle('is-open');
        dHead.setAttribute('aria-expanded', opened ? 'true' : 'false');
        return;
      }

      // Город — открывает карточку и переводит карту на этот город
      var cityBtn = t.closest('[data-city]');
      if (cityBtn) {
        var cityName = cityBtn.getAttribute('data-city');
        $$('.city').forEach(function (b) { b.classList.remove('is-active'); });
        cityBtn.classList.add('is-active');
        renderMap(cityName);
        openCity(cityName, cityBtn.getAttribute('data-district'));
        return;
      }

      var faq = t.closest('[data-faq]');
      if (faq) {
        // Мобильные — аккордеон (ответ уже в DOM), десктоп — модальное окно
        if (isMobileView()) toggleFaqAccordion(faq);
        else openFaq(faq.getAttribute('data-faq'));
        return;
      }

      var news = t.closest('[data-news]');
      if (news) { openNews(news.getAttribute('data-news')); return; }

      var art = t.closest('[data-article]');
      if (art) { openArticle(art.getAttribute('data-article')); return; }

      if (t.closest('[data-open-documents]')) { openDocuments(); return; }

      var faqMore = t.closest('#faq-more');
      if (faqMore) {
        $$('.faq-item-wrap[data-extra="1"]').forEach(function (el) { el.classList.remove('is-hidden'); });
        faqMore.parentElement.style.display = 'none';
        return;
      }

      var artMore = t.closest('#articles-more-btn');
      if (artMore) {
        var shownBefore = articlesShown;
        articlesShown += ARTICLES_STEP;
        renderArticles();
        revealNewArticles(shownBefore);
        return;
      }

      var top = t.closest('[data-scroll-top]');
      if (top) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  /* ========================================================================
     INIT
     ======================================================================== */

  function init() {
    applyConfig();
    renderSocialRows();
    renderSocialList();

    renderAdvantages();
    renderRequirements();
    renderSpecialties();
    renderPaymentHighlights();
    renderPayments();
    renderExtraPayments();
    renderBenefits();
    renderOffices();
    renderProcess();
    renderTraining();
    renderDocuments();
    renderTrust();
    renderReviews();
    renderNews();
    renderArticles();
    renderFaq();
    renderTags();
    renderOfficial();

    // Форма в первом экране
    var heroFormHost = $('#hero-form-host');
    if (heroFormHost) {
      heroFormHost.innerHTML = Forms.markup({ source: 'Первый экран', submitText: 'Жду звонка' });
      Forms.bind($('[data-app-form]', heroFormHost));
    }

    // Форма в секции контактов
    var contactFormHost = $('#contact-form-host');
    if (contactFormHost) {
      contactFormHost.innerHTML = Forms.markup({ source: 'Секция контактов', submitText: 'Перезвоните мне' });
      Forms.bind($('[data-app-form]', contactFormHost));
    }

    initHeader();
    initScrollHints();
    initTopics();
    initReveal();
    initCollapsible();
    initDelegation();
  }

  /* ========================================================================
     ПУБЛИЧНЫЙ API
     Виджет чата переиспользует ту же форму: та же валидация, та же маска
     телефона, те же UTM-метки и тот же вебхук. Дублировать её нельзя —
     иначе правки в одном месте не доедут до другого.
     ======================================================================== */
  window.SITE.ui = {
    formMarkup: Forms.markup,
    bindForm: Forms.bind,
    openFormModal: Forms.openModal,
    escape: esc,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
