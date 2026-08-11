#!/bin/bash
# ==========================================================================
#  Настройка хостинга reg.ru: разворачивание сайта и автообновление
# --------------------------------------------------------------------------
#  Запускается на самом хостинге, после подключения по SSH.
#  Повторный запуск безопасен — скрипт проверяет текущее состояние.
#
#  Что делает:
#    1. клонирует репозиторий в корень сайта (или обновляет, если он уже там);
#    2. ставит задание cron, которое каждые 2 минуты подтягивает изменения
#       из GitHub. Ключи для этого не нужны — репозиторий публичный.
#
#  Запуск:
#    curl -sL https://raw.githubusercontent.com/dios07022004-coder/svo2/main/setup-hosting.sh | bash -s -- /путь/к/корню/сайта
# ==========================================================================

set -e

REPO="https://github.com/dios07022004-coder/svo2.git"
TARGET="$1"

if [ -z "$TARGET" ]; then
  echo "Ошибка: не указан корень сайта."
  echo "Пример: bash setup-hosting.sh /var/www/u3587604/data/www/example.ru"
  exit 1
fi

# --------------------------------------------------------------------------
# 1. Подбираем рабочий git
# --------------------------------------------------------------------------
# Системный git на reg.ru — версии 1.7.1, он не умеет работать с современным
# TLS у GitHub и падает на клонировании. Панель ставит алиас git2192.
echo "==> Проверяю git"
GIT=""
for candidate in git2192 git; do
  if command -v "$candidate" >/dev/null 2>&1; then
    ver=$("$candidate" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+' | head -1)
    major=${ver%%.*}
    minor=${ver##*.}
    if [ "$major" -gt 1 ] || { [ "$major" -eq 1 ] && [ "$minor" -ge 8 ]; }; then
      GIT="$candidate"
      break
    fi
  fi
done

if [ -z "$GIT" ]; then
  echo "    Не нашёл git новее 1.8. Включите его в панели ISPmanager."
  exit 1
fi
echo "    $($GIT --version) — подходит"

# --------------------------------------------------------------------------
# 2. Каталог сайта
# --------------------------------------------------------------------------
echo
echo "==> Каталог сайта"
if [ ! -d "$TARGET" ]; then
  echo "    Каталог $TARGET не найден."
  echo "    Путь смотрите в ISPmanager → Сайты → «Корневая директория»."
  exit 1
fi
cd "$TARGET"
echo "    $TARGET"

# --------------------------------------------------------------------------
# 3. Репозиторий
# --------------------------------------------------------------------------
echo
echo "==> Репозиторий"
if [ -d .git ]; then
  echo "    Уже развёрнут — обновляю до актуального состояния."
  $GIT fetch origin main
  $GIT reset --hard origin/main
else
  # Заглушка хостера мешает клонировать в непустой каталог
  rm -f index.html index.php default.html 2>/dev/null || true

  if [ -n "$(ls -A . 2>/dev/null)" ]; then
    echo "    Каталог не пуст — забираю репозиторий во временную папку."
    TMP=$(mktemp -d)
    $GIT clone "$REPO" "$TMP/repo"
    mv "$TMP/repo/.git" .
    rm -rf "$TMP"
    $GIT reset --hard HEAD
  else
    $GIT clone "$REPO" .
  fi
  echo "    Развёрнут."
fi

# --------------------------------------------------------------------------
# 4. Автообновление через cron
# --------------------------------------------------------------------------
# SSH-ключи здесь не нужны: хостинг сам ходит в публичный репозиторий.
echo
echo "==> Автообновление"

PULL_SCRIPT="$HOME/svo2-pull.sh"
cat > "$PULL_SCRIPT" <<PULL
#!/bin/bash
# Подтягивает изменения из GitHub. Вызывается по cron.
cd "$TARGET" || exit 0
$GIT fetch origin main -q || exit 0
# clean не вызываем: в корне сайта лежат .htaccess от панели
# и .well-known для продления SSL — их трогать нельзя
$GIT reset --hard origin/main -q
PULL
chmod +x "$PULL_SCRIPT"
echo "    Скрипт обновления: $PULL_SCRIPT"

CRON_LINE="*/2 * * * * $PULL_SCRIPT >/dev/null 2>&1"

if command -v crontab >/dev/null 2>&1; then
  current=$(crontab -l 2>/dev/null || true)
  if printf '%s\n' "$current" | grep -qF "svo2-pull.sh"; then
    echo "    Задание cron уже есть."
  else
    printf '%s\n%s\n' "$current" "$CRON_LINE" | grep -v '^$' | crontab -
    echo "    Задание cron добавлено: проверка каждые 2 минуты."
  fi
else
  echo "    Команда crontab недоступна. Добавьте задание через панель:"
  echo "    ISPmanager → Планировщик (cron) → Создать"
  echo "    Команда: $PULL_SCRIPT"
  echo "    Период : каждые 2 минуты"
fi

# --------------------------------------------------------------------------
echo
echo "==> Готово. Текущая версия сайта:"
$GIT log -1 --format='    %h %s (%ci)'
echo
echo "Откройте сайт в браузере."
echo "Дальше правки на компьютере: git push — и через пару минут они на сайте."
