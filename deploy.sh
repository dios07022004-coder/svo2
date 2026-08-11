#!/bin/bash
# ==========================================================================
#  Прямая заливка сайта на хостинг reg.ru
# --------------------------------------------------------------------------
#  Запускается на своём компьютере. GitHub не нужен — файлы уходят
#  напрямую по SSH через rsync: передаются только изменившиеся.
#
#  Использование:
#      ./deploy.sh              — показать, что изменится (ничего не меняет)
#      ./deploy.sh --go         — залить изменения
#      ./deploy.sh --go --clean — залить и удалить на сервере лишние файлы
#
#  Первый запуск спросит пароль от хостинга. Чтобы не спрашивал —
#  настройте ключ, см. DEPLOY.md.
# ==========================================================================

set -e

HOST="server233.hosting.reg.ru"
USER="u3587604"
REMOTE="/var/www/u3587604/data/www/xn----8sbe0aignfczgnl9b9e7b.xn--p1ai"
KEY="$HOME/.ssh/regru_deploy"

cd "$(dirname "$0")"

# --------------------------------------------------------------------------
# Что НЕ заливаем
# --------------------------------------------------------------------------
EXCLUDES=(
  --exclude '.git'
  --exclude '.github'
  --exclude '.gitignore'
  --exclude '.DS_Store'
  --exclude '._*'
  --exclude '.claude'
  --exclude '*.zip'
  --exclude 'фото для наполнения'
  --exclude 'картинке для операторов'
  --exclude 'deploy.sh'
  --exclude 'setup-hosting.sh'
  --exclude 'setup-ssh-key.sh'
  --exclude 'DEPLOY.md'
  --exclude 'README.md'
)

# Эти файлы на сервере трогать нельзя даже в режиме --clean:
# .htaccess создаёт панель, через .well-known продлевается SSL-сертификат
PROTECT=(
  --filter 'protect .htaccess'
  --filter 'protect .well-known'
  --filter 'protect .git'
)

# --------------------------------------------------------------------------
# Ключ или пароль
# --------------------------------------------------------------------------
if [ -f "$KEY" ] && ssh -i "$KEY" -o BatchMode=yes -o ConnectTimeout=8 \
     -o StrictHostKeyChecking=accept-new "$USER@$HOST" true 2>/dev/null; then
  SSH_CMD="ssh -i $KEY -o StrictHostKeyChecking=accept-new"
  echo "Вход по ключу."
else
  SSH_CMD="ssh -o StrictHostKeyChecking=accept-new"
  echo "Вход по паролю — rsync запросит его ниже."
fi

# --------------------------------------------------------------------------
# Режим
# --------------------------------------------------------------------------
MODE_GO=0
MODE_CLEAN=0
for arg in "$@"; do
  [ "$arg" = "--go" ] && MODE_GO=1
  [ "$arg" = "--clean" ] && MODE_CLEAN=1
done

FLAGS=(-rlptz --human-readable --itemize-changes)
[ "$MODE_GO" -eq 0 ] && FLAGS+=(--dry-run)
[ "$MODE_CLEAN" -eq 1 ] && FLAGS+=(--delete)

echo "Сервер : $USER@$HOST"
echo "Каталог: $REMOTE"
if [ "$MODE_GO" -eq 0 ]; then
  echo "Режим  : ПРОСМОТР (файлы не меняются)"
else
  echo "Режим  : ЗАЛИВКА$([ "$MODE_CLEAN" -eq 1 ] && echo ' с удалением лишнего')"
fi
echo "----------------------------------------------------------------"

rsync "${FLAGS[@]}" "${EXCLUDES[@]}" "${PROTECT[@]}" \
      -e "$SSH_CMD" \
      ./ "$USER@$HOST:$REMOTE/"

echo "----------------------------------------------------------------"
if [ "$MODE_GO" -eq 0 ]; then
  echo "Это был просмотр. Чтобы залить:  ./deploy.sh --go"
else
  echo "Готово. Проверьте: https://сво-консультация.рф"
fi
