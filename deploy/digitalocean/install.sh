#!/usr/bin/env bash
# SpecGuard DigitalOcean droplet bootstrap (Ubuntu 22.04+).
# Run as root on a fresh droplet:
#   curl -fsSL https://raw.githubusercontent.com/williamsburgsh-commits/SpecGuard/main/deploy/digitalocean/install.sh | bash
# Or clone first and run: bash deploy/digitalocean/install.sh
set -euo pipefail

REPO_URL="${SPECGUARD_REPO_URL:-https://github.com/williamsburgsh-commits/SpecGuard.git}"
INSTALL_DIR="${SPECGUARD_INSTALL_DIR:-/opt/specguard}"
BRANCH="${SPECGUARD_GIT_BRANCH:-main}"

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Run as root (sudo bash install.sh)" >&2
  exit 1
fi

echo "==> Installing Node.js 22..."
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs git
fi

echo "==> Creating specguard user..."
id -u specguard >/dev/null 2>&1 || useradd --system --home-dir "$INSTALL_DIR" --shell /usr/sbin/nologin specguard

echo "==> Cloning/updating repo at $INSTALL_DIR..."
if [[ -d "$INSTALL_DIR/.git" ]]; then
  git -C "$INSTALL_DIR" fetch origin
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --rebase origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

chown -R specguard:specguard "$INSTALL_DIR"

ENV_FILE="$INSTALL_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "==> Creating $ENV_FILE from template..."
  cp "$INSTALL_DIR/deploy/digitalocean/env.example" "$ENV_FILE"
  chown specguard:specguard "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  echo ""
  echo "IMPORTANT: Edit $ENV_FILE and set CLAWPUMP_API_KEY + GITHUB_TOKEN, then:"
  echo "  systemctl restart specguard-operator"
  echo ""
fi

echo "==> Installing systemd service..."
cp "$INSTALL_DIR/deploy/digitalocean/specguard-operator.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable specguard-operator

if grep -q 'cpk_your_key_here' "$ENV_FILE" 2>/dev/null; then
  echo "==> Skipping service start until .env is configured."
else
  systemctl restart specguard-operator
  echo "==> Service started."
fi

echo ""
echo "Done. Useful commands:"
echo "  nano $ENV_FILE"
echo "  systemctl status specguard-operator"
echo "  journalctl -u specguard-operator -f"
