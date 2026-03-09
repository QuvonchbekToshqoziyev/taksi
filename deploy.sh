#!/bin/bash
set -e

# ============================================
#  Taxi Bot — Ubuntu Server Deploy Script
# ============================================
# Usage:
#   1. Copy this script to your Ubuntu server
#   2. chmod +x deploy.sh
#   3. sudo ./deploy.sh
# ============================================

APP_DIR="/opt/taxi-bot"
REPO_URL="https://github.com/QuvonchbekToshqoziyev/taksi.git"
APP_SUBDIR="Taxi_manitor"
NODE_VERSION="20"
DB_NAME="taksi"
DB_USER="postgres"
DB_PASS="1111"

echo "===> 1. Updating system packages..."
apt update && apt upgrade -y

echo "===> 2. Installing Node.js ${NODE_VERSION}.x..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt install -y nodejs
fi
echo "Node: $(node -v), npm: $(npm -v)"

echo "===> 3. Installing PostgreSQL..."
if ! command -v psql &>/dev/null; then
  apt install -y postgresql postgresql-contrib
fi
systemctl enable postgresql
systemctl start postgresql

echo "===> 4. Setting up database..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1 || \
  sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME};"
sudo -u postgres psql -c "ALTER USER ${DB_USER} PASSWORD '${DB_PASS}';"

echo "===> 5. Cloning repository..."
if [ -d "$APP_DIR" ]; then
  echo "Directory $APP_DIR already exists, pulling latest changes..."
  cd "$APP_DIR" && git pull origin main
else
  git clone "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR/$APP_SUBDIR"

echo "===> 6. Installing npm dependencies..."
npm ci

echo "===> 7. Running Prisma migrations..."
npx prisma generate
npx prisma migrate deploy

echo "===> 8. Building the project..."
npm run build

echo "===> 9. Creating systemd service..."
cat > /etc/systemd/system/taxi-bot.service <<EOF
[Unit]
Description=Taxi Telegram Bot
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}/${APP_SUBDIR}
EnvironmentFile=${APP_DIR}/${APP_SUBDIR}/.env
ExecStart=/usr/bin/node dist/main
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable taxi-bot
systemctl restart taxi-bot

echo ""
echo "============================================"
echo "  Deployment complete!"
echo "  Bot is running as systemd service."
echo ""
echo "  Useful commands:"
echo "    sudo systemctl status taxi-bot"
echo "    sudo systemctl restart taxi-bot"
echo "    sudo journalctl -u taxi-bot -f"
echo "============================================"
