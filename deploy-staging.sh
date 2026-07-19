#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${APP_DIR:-/opt/taxi-bot-staging}"
PRODUCTION_ENV="${PRODUCTION_ENV:-/opt/taxi-bot/.env}"
STAGING_ENV="${APP_DIR}/.env"

read_env() {
  local file_path="$1"
  local key="$2"
  local value
  value="$(sed -n "s/^${key}=//p" "${file_path}" | tail -1)"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  printf '%s' "${value}"
}

if [[ ! -f "${STAGING_ENV}" ]]; then
  echo "Missing ${STAGING_ENV}. Create it from .env.staging.example."
  exit 1
fi

if [[ "$(read_env "${STAGING_ENV}" APP_ENV)" != "staging" ]]; then
  echo "${STAGING_ENV} must contain APP_ENV=staging."
  exit 1
fi

for required_key in DATABASE_URL SUPERADMIN_TG_ID STAGING_ALLOWED_USER_IDS; do
  if [[ -z "$(read_env "${STAGING_ENV}" "${required_key}")" ]]; then
    echo "${required_key} is required in ${STAGING_ENV}."
    exit 1
  fi
done

if [[ -z "$(read_env "${STAGING_ENV}" BOT_TOKEN)" && \
      -z "$(read_env "${STAGING_ENV}" ADMIN_BOT_TOKEN)" && \
      -z "$(read_env "${STAGING_ENV}" CLIENT_BOT_TOKEN)" && \
      -z "$(read_env "${STAGING_ENV}" DRIVER_BOT_TOKEN)" ]]; then
  echo "At least one staging Telegram bot token is required in ${STAGING_ENV}."
  exit 1
fi

if [[ -f "${PRODUCTION_ENV}" ]]; then
  staging_database="$(read_env "${STAGING_ENV}" DATABASE_URL)"
  production_database="$(read_env "${PRODUCTION_ENV}" DATABASE_URL)"
  if [[ "${staging_database}" == "${production_database}" ]]; then
    echo "Staging and production DATABASE_URL values must differ."
    exit 1
  fi

  production_superadmin="$(read_env "${PRODUCTION_ENV}" SUPERADMIN_TG_ID)"
  staging_users=",$(read_env "${STAGING_ENV}" STAGING_ALLOWED_USER_IDS),"
  allow_shared_superadmin="$(read_env "${STAGING_ENV}" STAGING_ALLOW_PRODUCTION_SUPERADMIN)"
  if [[ -n "${production_superadmin}" && \
        "${staging_users// /}" == *",${production_superadmin},"* && \
        "${allow_shared_superadmin}" != "true" ]]; then
    echo "Production superadmin reuse requires STAGING_ALLOW_PRODUCTION_SUPERADMIN=true."
    exit 1
  fi

  token_keys=(BOT_TOKEN ADMIN_BOT_TOKEN CLIENT_BOT_TOKEN DRIVER_BOT_TOKEN)
  for staging_key in "${token_keys[@]}"; do
    staging_token="$(read_env "${STAGING_ENV}" "${staging_key}")"
    [[ -z "${staging_token}" ]] && continue
    for production_key in "${token_keys[@]}"; do
      if [[ "${staging_token}" == "$(read_env "${PRODUCTION_ENV}" "${production_key}")" ]]; then
        echo "Staging Telegram bot tokens must not match production."
        exit 1
      fi
    done
  done

  staging_session="$(read_env "${STAGING_ENV}" TG_SESSION)"
  if [[ -n "${staging_session}" && "${staging_session}" == "$(read_env "${PRODUCTION_ENV}" TG_SESSION)" ]]; then
    echo "Staging TG_SESSION must belong to a different Telegram account."
    exit 1
  fi
fi

exec env \
  APP_DIR="${APP_DIR}" \
  APP_USER="${APP_USER:-taxi-bot-staging}" \
  SERVICE_NAME="${SERVICE_NAME:-taxi-bot-staging}" \
  SERVICE_MEMORY_HIGH="${SERVICE_MEMORY_HIGH:-128M}" \
  SERVICE_MEMORY_MAX="${SERVICE_MEMORY_MAX:-192M}" \
  "${SCRIPT_DIR}/deploy.sh"
