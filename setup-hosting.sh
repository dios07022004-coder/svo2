#!/bin/bash
# ==========================================================================
#  Первичная настройка хостинга reg.ru
# --------------------------------------------------------------------------
#  Запускается ОДИН РАЗ на самом хостинге, после подключения по SSH.
#  Делает две вещи: прописывает ключ для деплоя и клонирует репозиторий
#  в корень сайта.
#
#  Как запустить:
#    1. Подключитесь к хостингу:  ssh ВАШ_ЛОГИН@server233.hosting.reg.ru
#    2. Скачайте и выполните:
#         curl -sL https://raw.githubusercontent.com/dios07022004-coder/svo2/main/setup-hosting.sh | bash -s -- /путь/к/корню/сайта
#
#  Либо скопируйте файл на хостинг и выполните:
#         bash setup-hosting.sh /путь/к/корню/сайта
# ==========================================================================

set -e

REPO="https://github.com/dios07022004-coder/svo2.git"

# Публичный ключ для деплоя с GitHub Actions.
# Секретным не является: расшифровать по нему приватный ключ невозможно.
DEPLOY_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG1QluDM3fRthqxqCLCNqz/PhbggtD/BG3vDW1gl2WWE github-deploy-svo2"

TARGET="$1"

if [ -z "$TARGET" ]; then
  echo "Ошибка: не указан корень сайта."
  echo "Пример: bash setup-hosting.sh /home/u1234567/example.ru/www"
  echo
  echo "Путь смотрите в ISPmanager → Сайты → колонка «Корневая директория»."
  exit 1
fi

echo "==> 1. Ключ для автодеплоя"
mkdir -p ~/.ssh && chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys

if grep -qF "$DEPLOY_KEY" ~/.ssh/authorized_keys; then
  echo "    Ключ уже прописан, пропускаю."
else
  echo "$DEPLOY_KEY" >> ~/.ssh/authorized_keys
  echo "    Ключ добавлен в ~/.ssh/authorized_keys"
fi

echo
echo "==> 2. Версия git"
# Системный git на reg.ru — 1.7.1, он не умеет работать с TLS у GitHub.
if command -v git2192 >/dev/null 2>&1; then
  GIT=git2192
else
  GIT=git
fi
echo "    Используется: $($GIT --version)"

echo
echo "==> 3. Каталог сайта"
if [ ! -d "$TARGET" ]; then
  echo "    Каталог $TARGET не найден. Проверьте путь в ISPmanager."
  exit 1
fi
cd "$TARGET"
echo "    $TARGET"

echo
echo "==> 4. Репозиторий"
if [ -d .git ]; then
  echo "    Репозиторий уже есть — обновляю до актуального состояния."
  $GIT fetch origin main
  $GIT reset --hard origin/main
else
  # Заглушка хостера мешает клонированию в непустой каталог
  rm -f index.html index.php default.html 2>/dev/null || true

  if [ -n "$(ls -A . 2>/dev/null)" ]; then
    echo "    В каталоге есть файлы. Клонирую во временную папку и переношу."
    TMP=$(mktemp -d)
    $GIT clone "$REPO" "$TMP/repo"
    # Переносим вместе со скрытыми файлами, включая .git
    (shopt -s dotglob 2>/dev/null || true; mv "$TMP/repo/"* . 2>/dev/null || true)
    mv "$TMP/repo/.git" . 2>/dev/null || true
    mv "$TMP/repo/.gitignore" . 2>/dev/null || true
    rm -rf "$TMP"
    $GIT reset --hard HEAD
  else
    $GIT clone "$REPO" .
  fi
  echo "    Репозиторий склонирован."
fi

echo
echo "==> Готово. Текущая версия:"
$GIT log -1 --format='    %h %s (%ci)'
echo
echo "Откройте сайт в браузере — должна открыться главная страница."
echo "Дальше настройте секреты в GitHub, см. DEPLOY.md, шаг 3."
