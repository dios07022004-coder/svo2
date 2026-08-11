#!/bin/bash
# ==========================================================================
#  Установка ключа для мгновенного деплоя
# --------------------------------------------------------------------------
#  Запускается на хостинге reg.ru через Shell-клиент.
#
#  Зачем: в панели ISPmanager на шаред-хостинге нет раздела «SSH-ключи»,
#  а файл ~/.ssh/authorized_keys оказался КАТАЛОГОМ — из-за этого вход по
#  ключу не работает (ssh молча игнорирует каталог и просит пароль).
#
#  Скрипт аккуратно приводит ~/.ssh в рабочее состояние:
#  сохраняет резервную копию, создаёт нормальный файл authorized_keys,
#  прописывает ключ и выставляет права, которые требует sshd.
#
#  Запуск:
#    curl -sL https://raw.githubusercontent.com/dios07022004-coder/svo2/main/setup-ssh-key.sh | bash
# ==========================================================================

set -e

DEPLOY_KEY="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIG1QluDM3fRthqxqCLCNqz/PhbggtD/BG3vDW1gl2WWE github-deploy-svo2"
AK="$HOME/.ssh/authorized_keys"

echo "==> Текущее состояние ~/.ssh"
mkdir -p "$HOME/.ssh"
ls -la "$HOME/.ssh" 2>/dev/null | sed 's/^/    /'

echo
echo "==> Проверяю authorized_keys"

if [ -d "$AK" ]; then
  echo "    Это каталог — так быть не должно, sshd ожидает файл."

  content=$(ls -A "$AK" 2>/dev/null || true)
  if [ -n "$content" ]; then
    echo "    Внутри есть файлы:"
    ls -la "$AK" | sed 's/^/      /'
    echo
    echo "    Сохраняю каталог как authorized_keys.backup и собираю из него ключи."
    mv "$AK" "$HOME/.ssh/authorized_keys.backup"
    # Собираем все найденные ключи из резервной копии в новый файл
    cat "$HOME/.ssh/authorized_keys.backup"/* > "$AK" 2>/dev/null || : > "$AK"
  else
    echo "    Каталог пустой — удаляю."
    rmdir "$AK"
    : > "$AK"
  fi
elif [ -f "$AK" ]; then
  echo "    Файл на месте."
  cp "$AK" "$HOME/.ssh/authorized_keys.backup" 2>/dev/null || true
else
  echo "    Файла нет — создаю."
  : > "$AK"
fi

echo
echo "==> Прописываю ключ"
if grep -qF "$DEPLOY_KEY" "$AK" 2>/dev/null; then
  echo "    Ключ уже прописан."
else
  echo "$DEPLOY_KEY" >> "$AK"
  echo "    Ключ добавлен."
fi

echo
echo "==> Права доступа"
# sshd отказывается работать с ключами, если права слишком широкие
chmod 700 "$HOME/.ssh"
chmod 600 "$AK"
chmod 711 "$HOME" 2>/dev/null || true
ls -la "$HOME/.ssh" | sed 's/^/    /'

echo
echo "==> Содержимое authorized_keys"
awk '{print "    " NR ": " $1 " ... " $NF}' "$AK"

echo
echo "Готово. Теперь проверьте с компьютера:"
echo "    ssh -i ~/.ssh/regru_deploy u3587604@server233.hosting.reg.ru 'echo OK'"
echo
echo "Если по-прежнему просит пароль — значит хостер запретил вход по ключу."
echo "В этом случае используйте вариант с FTP, см. DEPLOY.md."
