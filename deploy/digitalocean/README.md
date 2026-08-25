# SpecGuard on DigitalOcean

Run the heartbeat + quote operator on a small Ubuntu droplet when GitHub Actions billing is unavailable.

**Git push uses a PAT only** — you do not need GitHub Actions billing to update the public status page.

## Quick start

1. Create an **Ubuntu 22.04+ droplet** ($6/mo Basic is enough).
2. SSH in as root.
3. Clone and install:

```bash
git clone https://github.com/williamsburgsh-commits/SpecGuard.git /opt/specguard
bash /opt/specguard/deploy/digitalocean/install.sh
```

4. Edit secrets:

```bash
nano /opt/specguard/.env
```

Set at minimum:

| Variable | Value |
|---|---|
| `CLAWPUMP_API_KEY` | Your ClawPump key |
| `GITHUB_TOKEN` | GitHub PAT with **repo** scope (Contents: Read and write) |
| `SPECGUARD_GIT_PUSH` | `1` |

5. Start the operator:

```bash
systemctl restart specguard-operator
journalctl -u specguard-operator -f
```

## What it does

Every **5 minutes** the service:

1. Writes a heartbeat proof to `logs/heartbeat/`
2. Runs a quote cycle at **50 bps** spread (Phase 11)
3. Updates `site/status.json` + `docs/status.json` (`quoting`, `pnl`, `fills`)
4. **Git push** to `main` → GitHub Pages redeploys

## Manual one-shot (debug)

```bash
cd /opt/specguard
sudo -u specguard bash -lc 'set -a; source .env; set +a; node tools/do-operator-loop.mjs --once'
```

## GitHub PAT (not billing)

Create at **GitHub → Settings → Developer settings → Personal access tokens**:

- Classic token: enable **`repo`** scope, or
- Fine-grained: repository access to `SpecGuard`, **Contents: Read and write**

Paste into `.env` as `GITHUB_TOKEN`. This replaces the Actions operator for status sync.

## Disable GitHub Actions operator

The workflow [`.github/workflows/operator.yml`](../../.github/workflows/operator.yml) is disabled (schedule removed). Use this droplet instead.

## Files

| Path | Purpose |
|---|---|
| `tools/do-operator-loop.mjs` | Long-running loop |
| `tools/operator-cycle.mjs` | Single cycle logic |
| `tools/push-status.mjs` | Commit + push status |
| `specguard-operator.service` | systemd unit |
