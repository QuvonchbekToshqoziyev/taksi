#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/taxi-bot}"
APP_USER="${APP_USER:-taxi-bot}"
REPO_URL="${REPO_URL:-https://github.com/QuvonchbekToshqoziyev/taksi.git}"
REPO_REF="${REPO_REF:-main}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root so it can manage the systemd service."
  exit 1
fi

for command_name in git node npm runuser systemctl; do
  command -v "${command_name}" >/dev/null || {
    echo "Missing required command: ${command_name}"
    exit 1
  }
done

NODE_BIN="$(command -v node)"

if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --home-dir "${APP_DIR}" --shell /usr/sbin/nologin "${APP_USER}"
fi

if [[ -d "${APP_DIR}/.git" ]]; then
  runuser -u "${APP_USER}" -- git -C "${APP_DIR}" fetch origin "${REPO_REF}"
  runuser -u "${APP_USER}" -- git -C "${APP_DIR}" checkout --detach FETCH_HEAD
else
  install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"
  runuser -u "${APP_USER}" -- git clone --branch "${REPO_REF}" --single-branch "${REPO_URL}" "${APP_DIR}"
fi

if [[ ! -f "${APP_DIR}/.env" ]]; then
  echo "Missing ${APP_DIR}/.env. Copy .env.example and provide real secrets first."
  exit 1
fi

chown "${APP_USER}:${APP_USER}" "${APP_DIR}/.env"
chmod 600 "${APP_DIR}/.env"

runuser -u "${APP_USER}" -- env HOME="${APP_DIR}" npm --prefix "${APP_DIR}" ci
runuser -u "${APP_USER}" -- env HOME="${APP_DIR}" npm --prefix "${APP_DIR}" exec -- prisma generate --schema="${APP_DIR}/prisma/schema.prisma"
runuser -u "${APP_USER}" -- env HOME="${APP_DIR}" npm --prefix "${APP_DIR}" exec -- prisma migrate deploy --schema="${APP_DIR}/prisma/schema.prisma"
runuser -u "${APP_USER}" -- env HOME="${APP_DIR}" npm --prefix "${APP_DIR}" run build
runuser -u "${APP_USER}" -- env HOME="${APP_DIR}" npm --prefix "${APP_DIR}" prune --omit=dev

install -m 0644 /dev/stdin /etc/systemd/system/taxi-bot.service <<EOF
[Unit]
Description=Taxi Telegram Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}
EnvironmentFile=${APP_DIR}/.env
ExecStart=${NODE_BIN} ${APP_DIR}/dist/main.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now taxi-bot
systemctl restart taxi-bot
systemctl --no-pager --full status taxi-bot
