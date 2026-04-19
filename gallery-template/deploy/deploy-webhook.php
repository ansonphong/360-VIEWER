<?php
// GitHub Webhook Deploy Script for 360 Gallery
// Auto-deploys when you push to your repo
//
// SERVER SETUP:
//   1. Create a deploy user:
//      sudo adduser --system --group gallery-deploy
//      sudo usermod -aG www-data gallery-deploy
//
//   2. Clone your repo as the deploy user:
//      sudo -u gallery-deploy git clone https://github.com/YOU/YOUR-GALLERY.git /var/www/gallery
//      cd /var/www/gallery
//      sudo -u gallery-deploy git submodule update --init --recursive
//
//   3. Configure git for the deploy user:
//      sudo -u gallery-deploy git config --global pull.ff only
//      sudo -u gallery-deploy git config --global --add safe.directory /var/www/gallery
//      sudo -u gallery-deploy git config --global --add safe.directory /var/www/gallery/360-viewer
//
//   4. Place this file at /var/www/gallery/deploy.php (or wherever your webserver serves it)
//
//   5. Generate secrets:
//      python3 -c "import secrets; print(secrets.token_hex(32))"
//      Use one for WEBHOOK_SECRET (set in GitHub webhook settings)
//      Use another for URL_SECRET (append as ?SECRET=xxx in webhook URL)
//
//   6. Set up the GitHub webhook:
//      Repo > Settings > Webhooks > Add webhook
//      Payload URL: https://yourdomain.com/deploy.php?SECRET=YOUR_URL_SECRET
//      Content type: application/json
//      Secret: YOUR_WEBHOOK_SECRET
//      Events: Just the push event
//
//   7. Nginx config (add to your server block):
//      location = /deploy.php {
//          fastcgi_pass unix:/var/run/php/php-fpm.sock;
//          fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
//          include fastcgi_params;
//      }
//
//   8. Sudoers (allow www-data to run git as deploy user):
//      echo 'www-data ALL=(gallery-deploy) NOPASSWD: /usr/bin/git' | sudo tee /etc/sudoers.d/gallery-deploy
//
// IMPORTANT GOTCHAS:
//   - The .git directories must be owned by the deploy user, NOT www-data
//   - After chowning web files to www-data, restore .git ownership to deploy user
//   - safe.directory must be set for BOTH the main repo and the 360-viewer submodule
//   - Use pull.ff only to prevent merge commits on deploy

// ============================================================
// Configuration - CHANGE THESE
// ============================================================
$webhookSecret = 'CHANGE_ME_webhook_secret_from_github';
$urlSecret     = 'CHANGE_ME_url_secret_for_webhook_url';
$deployDir     = '/var/www/gallery';
$deployUser    = 'gallery-deploy';
$branch        = 'master'; // or 'main'
$logFile       = '/var/log/gallery-deploy.log';

// ============================================================
// Logging
// ============================================================
function logMessage($message) {
    global $logFile;
    file_put_contents($logFile, '[' . date('Y-m-d H:i:s') . '] ' . $message . "\n", FILE_APPEND | LOCK_EX);
}

// ============================================================
// Security: URL secret
// ============================================================
$providedSecret = $_GET['SECRET'] ?? '';
if (empty($providedSecret) || !hash_equals($urlSecret, $providedSecret)) {
    http_response_code(401);
    logMessage('ERROR: Invalid or missing URL secret');
    exit('Unauthorized');
}

// ============================================================
// Security: GitHub signature
// ============================================================
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
$rawPayload = file_get_contents('php://input');
$payload = isset($_POST['payload']) ? $_POST['payload'] : $rawPayload;
$verificationPayload = $rawPayload;

if (empty($signature)) {
    http_response_code(401);
    logMessage('ERROR: No GitHub signature');
    exit('Unauthorized');
}

$expected = 'sha256=' . hash_hmac('sha256', $verificationPayload, $webhookSecret);
if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    logMessage('ERROR: Invalid GitHub signature');
    exit('Unauthorized');
}

// ============================================================
// Parse payload
// ============================================================
$data = json_decode($payload, true);
if (!$data) {
    http_response_code(400);
    logMessage('ERROR: Invalid JSON');
    exit('Bad Request');
}

// Handle GitHub ping
if (isset($data['zen'])) {
    logMessage('INFO: GitHub ping received - webhook configured OK');
    http_response_code(200);
    exit('Pong!');
}

// Only deploy on push to target branch
if (!isset($data['ref']) || $data['ref'] !== 'refs/heads/' . $branch) {
    logMessage('INFO: Ignoring push to ' . ($data['ref'] ?? 'unknown'));
    exit('Ignored');
}

logMessage('INFO: Deploying commit ' . substr($data['after'], 0, 7));

// ============================================================
// Deploy
// ============================================================
chdir($deployDir);

// Stash any local changes
exec("sudo -u $deployUser git stash 2>&1", $out, $ret);

// Pull latest
exec("sudo -u $deployUser git pull origin $branch --force 2>&1", $out, $ret);
if ($ret !== 0) {
    http_response_code(500);
    logMessage('ERROR: Git pull failed: ' . implode(' ', $out));
    exit('Deploy failed');
}

// Update submodule
exec("sudo -u $deployUser git submodule update --init --recursive 2>&1", $out, $ret);
if ($ret !== 0) {
    logMessage('WARNING: Submodule update failed: ' . implode(' ', $out));
}

// Fix ownership: web files to www-data, .git dirs to deploy user
exec("chown -R www-data:www-data $deployDir 2>&1");
exec("chown -R $deployUser:$deployUser $deployDir/.git $deployDir/360-viewer/.git 2>&1");

$msg = $data['head_commit']['message'] ?? 'unknown';
$who = $data['head_commit']['committer']['name'] ?? 'unknown';
logMessage("SUCCESS: Deployed '$msg' by $who");

http_response_code(200);
echo json_encode(['status' => 'success', 'commit' => substr($data['after'], 0, 7)]);
?>
