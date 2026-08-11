#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Заливка сайта на хостинг reg.ru по FTP.

Запасной путь на случай, когда порт 22 закрыт провайдером или корпоративной
сетью и SSH не проходит (ошибка 10060). FTP работает по порту 21, его
блокируют заметно реже.

Ничего доустанавливать не нужно: используется только стандартная библиотека,
поэтому скрипт одинаково запускается на macOS, Windows и Linux.

Использование:
    python3 deploy-ftp.py                 — показать, что изменится
    python3 deploy-ftp.py --go            — залить изменения
    python3 deploy-ftp.py --go --clean    — залить и удалить лишнее на сервере

Данные для входа берутся из переменных окружения либо спрашиваются:
    FTP_HOST, FTP_USER, FTP_PASS, FTP_DIR
"""

import ftplib
import getpass
import os
import sys

# --------------------------------------------------------------------------
# Настройки по умолчанию
# --------------------------------------------------------------------------
DEFAULT_HOST = 'server233.hosting.reg.ru'
DEFAULT_USER = 'u3587604'
DEFAULT_DIR = '/www/xn----8sbe0aignfczgnl9b9e7b.xn--p1ai'

# Каталоги и файлы, которые на сервер не уходят
SKIP_DIRS = {
    '.git', '.github', '.claude', '.vscode', '.idea', 'node_modules',
    'фото для наполнения', 'картинке для операторов',
}
SKIP_FILES = {
    '.gitignore', '.DS_Store', 'deploy.sh', 'deploy-ftp.py',
    'setup-hosting.sh', 'setup-ssh-key.sh', 'DEPLOY.md', 'README.md',
    'ДОСТУП-ДЛЯ-НАПАРНИКА.md',
}
SKIP_SUFFIX = ('.zip', '.log', '.tmp')

# Эти объекты на сервере не трогаем даже при --clean:
# .htaccess создаёт панель, через .well-known продлевается SSL-сертификат
PROTECTED = {'.htaccess', '.well-known', '.git'}


def skip(name, is_dir):
    if is_dir:
        return name in SKIP_DIRS
    if name in SKIP_FILES or name.startswith('._'):
        return True
    return name.endswith(SKIP_SUFFIX)


def local_tree(root):
    """Собирает список файлов сайта: путь относительно корня -> размер."""
    files = {}
    for base, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if not skip(d, True)]
        for n in names:
            if skip(n, False):
                continue
            full = os.path.join(base, n)
            rel = os.path.relpath(full, root).replace(os.sep, '/')
            files[rel] = os.path.getsize(full)
    return files


def remote_size(ftp, path):
    """Размер файла на сервере или None, если файла нет."""
    try:
        return ftp.size(path)
    except (ftplib.error_perm, ftplib.error_temp):
        return None


def ensure_dir(ftp, path, created):
    """Создаёт каталог на сервере, если его ещё нет."""
    if not path or path in created:
        return
    parent = path.rsplit('/', 1)[0] if '/' in path else ''
    ensure_dir(ftp, parent, created)
    try:
        ftp.mkd(path)
    except ftplib.error_perm:
        pass  # уже существует
    created.add(path)


def remote_tree(ftp, path, acc=None, depth=0):
    """Рекурсивно обходит каталог на сервере."""
    if acc is None:
        acc = set()
    if depth > 8:
        return acc
    try:
        entries = list(ftp.mlsd(path))
    except (ftplib.error_perm, AttributeError):
        return acc

    for name, facts in entries:
        if name in ('.', '..') or name in PROTECTED:
            continue
        full = (path.rstrip('/') + '/' + name).lstrip('/')
        if facts.get('type') == 'dir':
            remote_tree(ftp, full, acc, depth + 1)
        elif facts.get('type') == 'file':
            acc.add(full)
    return acc


def main():
    go = '--go' in sys.argv
    clean = '--clean' in sys.argv

    root = os.path.dirname(os.path.abspath(__file__))

    host = os.environ.get('FTP_HOST') or input('FTP-хост [%s]: ' % DEFAULT_HOST) or DEFAULT_HOST
    user = os.environ.get('FTP_USER') or input('Логин [%s]: ' % DEFAULT_USER) or DEFAULT_USER
    password = os.environ.get('FTP_PASS') or getpass.getpass('Пароль: ')
    target = os.environ.get('FTP_DIR') or input('Каталог сайта [%s]: ' % DEFAULT_DIR) or DEFAULT_DIR

    print()
    print('Сервер : %s@%s' % (user, host))
    print('Каталог: %s' % target)
    print('Режим  : %s' % ('ЗАЛИВКА' + (' с удалением лишнего' if clean else '')
                           if go else 'ПРОСМОТР (файлы не меняются)'))
    print('-' * 64)

    files = local_tree(root)

    try:
        ftp = ftplib.FTP(host, timeout=30)
        ftp.login(user, password)
    except ftplib.error_perm as e:
        print('Не пускает: %s' % e)
        print('Проверьте логин и пароль. FTP-пользователей можно завести')
        print('в панели: ISPmanager → FTP-пользователи.')
        return 1
    except OSError as e:
        print('Не удалось подключиться: %s' % e)
        print('Если и порт 21 закрыт — заливайте через Менеджер файлов в панели.')
        return 1

    try:
        ftp.set_pasv(True)
        try:
            ftp.cwd(target)
        except ftplib.error_perm:
            print('Каталог %s не найден. Проверьте путь.' % target)
            return 1

        uploaded = skipped = 0
        created = set()

        for rel in sorted(files):
            size = files[rel]
            rsize = remote_size(ftp, rel)

            if rsize == size:
                skipped += 1
                continue

            mark = 'новый ' if rsize is None else 'изменён'
            print('  %s  %s' % (mark, rel))
            uploaded += 1

            if go:
                if '/' in rel:
                    ensure_dir(ftp, rel.rsplit('/', 1)[0], created)
                with open(os.path.join(root, rel.replace('/', os.sep)), 'rb') as fh:
                    ftp.storbinary('STOR ' + rel, fh)

        removed = 0
        if clean:
            extra = remote_tree(ftp, '') - set(files)
            for rel in sorted(extra):
                print('  лишний %s' % rel)
                removed += 1
                if go:
                    try:
                        ftp.delete(rel)
                    except ftplib.error_perm:
                        pass

        print('-' * 64)
        print('Файлов всего: %d | к отправке: %d | без изменений: %d%s'
              % (len(files), uploaded, skipped,
                 ' | лишних: %d' % removed if clean else ''))

        if not go:
            print()
            print('Это был просмотр. Чтобы залить:  python3 deploy-ftp.py --go')
        else:
            print()
            print('Готово. Проверьте: https://сво-консультация.рф')

    finally:
        try:
            ftp.quit()
        except Exception:
            pass

    return 0


if __name__ == '__main__':
    sys.exit(main())
