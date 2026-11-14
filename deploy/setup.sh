#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu/Debian VPS. Run as root:
#   curl -fsSL https://raw.githubusercontent.com/OussemaBouchaala/onesourceit/main/deploy/setup.sh | bash
set -euo pipefail

DEPLOY_USER=deploy
APP_DIR=/opt/onesourceit

apt-get update
apt-get -y upgrade
apt-get install -y ca-certificates curl ufw unattended-upgrades

# Docker
if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

# Automatic security updates
dpkg-reconfigure -f noninteractive unattended-upgrades

# Firewall: SSH + web only
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# Deploy user used by GitHub Actions (SSH key only)
if ! id "$DEPLOY_USER" >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" "$DEPLOY_USER"
fi
usermod -aG docker "$DEPLOY_USER"
install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
touch "/home/$DEPLOY_USER/.ssh/authorized_keys"
chown "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh/authorized_keys"
chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"

install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$APP_DIR"

echo
echo "Done. Next: paste the deploy public key into /home/$DEPLOY_USER/.ssh/authorized_keys"
echo "and add the GitHub secrets listed in the README (VPS section)."
