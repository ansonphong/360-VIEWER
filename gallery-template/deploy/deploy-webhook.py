#!/usr/bin/env python3
"""
GitHub Webhook Deploy Script for 360 Gallery (Flask)
Auto-deploys when you push to your repo.

SERVER SETUP:
  1. Create a deploy user:
     sudo adduser --system --group gallery-deploy
     sudo usermod -aG www-data gallery-deploy

  2. Clone your repo as the deploy user:
     sudo -u gallery-deploy git clone https://github.com/YOU/YOUR-GALLERY.git /var/www/gallery
     cd /var/www/gallery
     sudo -u gallery-deploy git submodule update --init --recursive

  3. Configure git for the deploy user:
     sudo -u gallery-deploy git config --global pull.ff only
     sudo -u gallery-deploy git config --global --add safe.directory /var/www/gallery
     sudo -u gallery-deploy git config --global --add safe.directory /var/www/gallery/360-viewer

  4. Install dependencies:
     pip install flask gunicorn

  5. Generate secrets:
     python3 -c "import secrets; print(secrets.token_hex(32))"
     Use one for WEBHOOK_SECRET (set in GitHub webhook settings)
     Use another for URL_SECRET (append as ?secret=xxx in webhook URL)

  6. Set up the GitHub webhook:
     Repo > Settings > Webhooks > Add webhook
     Payload URL: https://yourdomain.com/deploy?secret=YOUR_URL_SECRET
     Content type: application/json
     Secret: YOUR_WEBHOOK_SECRET
     Events: Just the push event

  7. Run with gunicorn (systemd service recommended):
     gunicorn -w 1 -b 127.0.0.1:9000 deploy-webhook:app

  8. Nginx proxy:
     location = /deploy {
         proxy_pass http://127.0.0.1:9000;
         proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
     }

  9. Sudoers:
     echo 'www-data ALL=(gallery-deploy) NOPASSWD: /usr/bin/git' | sudo tee /etc/sudoers.d/gallery-deploy

IMPORTANT GOTCHAS:
  - The .git directories must be owned by the deploy user, NOT www-data
  - After chowning web files, restore .git ownership to deploy user
  - safe.directory must be set for BOTH the main repo and the 360-viewer submodule
  - Use pull.ff only to prevent merge commits on deploy
"""

import hashlib
import hmac
import json
import logging
import subprocess
from flask import Flask, request, jsonify

# ============================================================
# Configuration - CHANGE THESE
# ============================================================
WEBHOOK_SECRET = 'CHANGE_ME_webhook_secret_from_github'
URL_SECRET = 'CHANGE_ME_url_secret_for_webhook_url'
DEPLOY_DIR = '/var/www/gallery'
DEPLOY_USER = 'gallery-deploy'
BRANCH = 'master'  # or 'main'
LOG_FILE = '/var/log/gallery-deploy.log'

app = Flask(__name__)

logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format='[%(asctime)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)


def run_as(user, cmd, cwd=DEPLOY_DIR):
    """Run a git command as the deploy user."""
    result = subprocess.run(
        ['sudo', '-u', user] + cmd,
        cwd=cwd, capture_output=True, text=True
    )
    return result.returncode, result.stdout + result.stderr


def verify_signature(payload, signature):
    """Verify GitHub webhook HMAC-SHA256 signature."""
    if not signature:
        return False
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(), payload, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@app.route('/deploy', methods=['POST'])
def deploy():
    # URL secret check
    if request.args.get('secret') != URL_SECRET:
        logging.error('Invalid URL secret')
        return 'Unauthorized', 401

    # GitHub signature check
    signature = request.headers.get('X-Hub-Signature-256', '')
    raw = request.get_data()
    if not verify_signature(raw, signature):
        logging.error('Invalid GitHub signature')
        return 'Unauthorized', 401

    data = request.get_json(silent=True) or {}

    # Handle ping
    if 'zen' in data:
        logging.info('GitHub ping received')
        return 'Pong!'

    # Only deploy target branch
    ref = data.get('ref', '')
    if ref != f'refs/heads/{BRANCH}':
        logging.info(f'Ignoring push to {ref}')
        return 'Ignored'

    commit = data.get('after', '')[:7]
    logging.info(f'Deploying commit {commit}')

    # Stash local changes
    run_as(DEPLOY_USER, ['git', 'stash'])

    # Pull latest
    ret, out = run_as(DEPLOY_USER, ['git', 'pull', 'origin', BRANCH, '--force'])
    if ret != 0:
        logging.error(f'Git pull failed: {out}')
        return 'Deploy failed', 500

    # Update submodule
    ret, out = run_as(DEPLOY_USER, ['git', 'submodule', 'update', '--init', '--recursive'])
    if ret != 0:
        logging.warning(f'Submodule update issue: {out}')

    # Fix ownership
    subprocess.run(['chown', '-R', 'www-data:www-data', DEPLOY_DIR])
    subprocess.run(['chown', '-R', f'{DEPLOY_USER}:{DEPLOY_USER}',
                     f'{DEPLOY_DIR}/.git', f'{DEPLOY_DIR}/360-viewer/.git'])

    msg = data.get('head_commit', {}).get('message', 'unknown')
    who = data.get('head_commit', {}).get('committer', {}).get('name', 'unknown')
    logging.info(f"SUCCESS: Deployed '{msg}' by {who}")

    return jsonify({'status': 'success', 'commit': commit})


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=9000)
