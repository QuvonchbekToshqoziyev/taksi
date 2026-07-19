#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/taxi-bot}"
APP_USER="${APP_USER:-taxi-bot}"
SERVICE_NAME="${SERVICE_NAME:-taxi-bot}"
REPO_URL="${REPO_URL:-https://github.com/QuvonchbekToshqoziyev/taksi.git}"
REPO_REF="${REPO_REF:-main}"
BUILD_NODE_OPTIONS="${BUILD_NODE_OPTIONS:---max-old-space-size=384}"
SERVICE_MEMORY_HIGH="${SERVICE_MEMORY_HIGH:-192M}"
SERVICE_MEMORY_MAX="${SERVICE_MEMORY_MAX:-256M}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script as root so it can manage the systemd service."
  exit 1
fi

if [[ ! "${SERVICE_NAME}" =~ ^[a-zA-Z0-9_.@-]+$ ]]; then
  echo "Invalid SERVICE_NAME: ${SERVICE_NAME}"
  exit 1
fi

for command_name in git node npm runuser systemctl; do
  command -v "${command_name}" >/dev/null || {
    echo "Missing required command: ${command_name}"
    exit 1
  }
done

NODE_BIN="$(command -v node)"

run_as_app() {
  runuser -u "${APP_USER}" -- env HOME="${APP_DIR}" sh -c \
    'cd "$1" && shift && exec "$@"' sh "${APP_DIR}" "$@"
}

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

run_as_app npm ci
run_as_app npm exec -- prisma generate --schema="${APP_DIR}/prisma/schema.prisma"
run_as_app npm exec -- prisma migrate deploy --schema="${APP_DIR}/prisma/schema.prisma"
run_as_app env NODE_OPTIONS="${BUILD_NODE_OPTIONS}" npm run build
run_as_app env NODE_OPTIONS="${BUILD_NODE_OPTIONS}" npm prune --omit=dev

install -m 0644 /dev/stdin "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Taxi Telegram Bot (${SERVICE_NAME})
After=network-online.target postgresql.service
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
MemoryHigh=${SERVICE_MEMORY_HIGH}
MemoryMax=${SERVICE_MEMORY_MAX}
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"
systemctl restart "${SERVICE_NAME}"
systemctl --no-pager --full status "${SERVICE_NAME}"
