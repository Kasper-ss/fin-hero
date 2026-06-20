#!/usr/bin/env python3
"""
Telegram-бот для Mini App «Финансовый Герой».

Что делает:
  - Кнопка «Запустить» внизу чата (Menu Button → Web App)
  - Приветственное сообщение на команду /start

Запуск:
  export BOT_TOKEN="ваш_токен_от_BotFather"
  export WEBAPP_URL="https://ваш-проект.vercel.app"
  python3 bot.py

Если ошибка SSL на macOS / с антивирусом (Kaspersky и др.):
  pip3 install certifi
  # или временно:
  export SSL_VERIFY=0
  python3 bot.py
"""

import json
import os
import ssl
import time
import urllib.error
import urllib.request

TOKEN = os.environ.get("BOT_TOKEN", "")
WEBAPP_URL = os.environ.get("WEBAPP_URL", "")

WELCOME_TEXT = (
    "👋 Добро пожаловать в *Финансовый Герой*!\n\n"
    "В этом приложении вы *научитесь управлять своими финансами*: "
    "планировать бюджет, отслеживать доходы и расходы, ставить цели "
    "и шаг за шагом двигаться к финансовой свободе.\n\n"
    "Нажмите кнопку *🚀 Запустить* внизу экрана или кнопку ниже, "
    "чтобы открыть приложение."
)


def get_ssl_context():
    """SSL-контекст: certifi → системные сертификаты → отключение проверки."""
    skip_verify = os.environ.get("SSL_VERIFY", "1").lower() in ("0", "false", "no")
    if skip_verify:
        print("⚠️  SSL_VERIFY=0 — проверка сертификатов отключена")
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx

    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        pass

    return ssl.create_default_context()


def api(method, payload=None):
    url = f"https://api.telegram.org/bot{TOKEN}/{method}"
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=body, method="POST")
    if body:
        req.add_header("Content-Type", "application/json")
    ctx = get_ssl_context()
    with urllib.request.urlopen(req, timeout=60, context=ctx) as resp:
        return json.loads(resp.read())


def setup_menu_button():
    """Кнопка «Запустить» слева от поля ввода в чате с ботом."""
    return api("setChatMenuButton", {
        "menu_button": {
            "type": "web_app",
            "text": "🚀 Запустить",
            "web_app": {"url": WEBAPP_URL},
        },
    })


def send_welcome(chat_id):
    """Приветственное сообщение + inline-кнопка открытия приложения."""
    return api("sendMessage", {
        "chat_id": chat_id,
        "text": WELCOME_TEXT,
        "parse_mode": "Markdown",
        "reply_markup": {
            "inline_keyboard": [[{
                "text": "🚀 Запустить",
                "web_app": {"url": WEBAPP_URL},
            }]],
        },
    })


def poll_updates(offset=0):
    return api("getUpdates", {"offset": offset, "timeout": 30})


def print_ssl_help():
    print("\n--- Ошибка SSL ---")
    print("1) Установите сертификаты Python (macOS):")
    print("   Откройте: /Applications/Python 3.8/Install Certificates.command")
    print("2) Или: pip3 install certifi")
    print("3) Если стоит Kaspersky / VPN — временно отключите «проверку HTTPS»")
    print("   или запустите: export SSL_VERIFY=0 && python3 bot.py")
    print("4) Без Python: @BotFather → Menu Button → URL вашего Vercel\n")


def main():
    if not TOKEN:
        print("Ошибка: задайте переменную BOT_TOKEN (токен от @BotFather)")
        return
    if not WEBAPP_URL:
        print("Ошибка: задайте переменную WEBAPP_URL (ссылка Vercel)")
        return

    try:
        setup_menu_button()
        print(f"Кнопка «Запустить» установлена. URL: {WEBAPP_URL}")
        print("Бот запущен. Отправьте /start в чат с ботом.")
    except urllib.error.URLError as err:
        if "CERTIFICATE_VERIFY_FAILED" in str(err):
            print_ssl_help()
            return
        raise

    offset = 0
    while True:
        try:
            result = poll_updates(offset)
            for update in result.get("result", []):
                offset = update["update_id"] + 1
                message = update.get("message")
                if not message:
                    continue
                text = message.get("text", "")
                if text.startswith("/start"):
                    send_welcome(message["chat"]["id"])
        except urllib.error.HTTPError as err:
            print(f"HTTP ошибка: {err.code} {err.reason}")
            time.sleep(5)
        except urllib.error.URLError as err:
            if "CERTIFICATE_VERIFY_FAILED" in str(err):
                print_ssl_help()
                return
            print(f"Сетевая ошибка: {err}")
            time.sleep(5)
        except Exception as err:
            print(f"Ошибка: {err}")
            time.sleep(5)


if __name__ == "__main__":
    main()
