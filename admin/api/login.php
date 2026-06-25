<?php
declare(strict_types=1);

/* Admin login. POST {password}. Verifies against settings.admin_hash.
   Per-IP brute-force throttle. On success: fresh session + CSRF token. */

require __DIR__ . '/_bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(['error' => 'method'], 405);
}

start_session();
$ip      = client_ip();
$lockKey = 'lf_' . substr(md5($ip), 0, 24);

// throttle: max 10 failures / 15 min
[$fails, $ts] = array_pad(explode('|', (string) setting_get($lockKey, '0|0')), 2, '0');
$fails = (int) $fails;
$ts    = (int) $ts;
if ($fails >= 10 && (time() - $ts) < 900) {
    json_out(['error' => 'too_many_attempts'], 429);
}

$d   = body_json();
$pw  = is_string($d['password'] ?? null) ? $d['password'] : '';
$hash = setting_get('admin_hash');

usleep(300000); // 0.3s — slow brute force

if ($hash && password_verify($pw, $hash)) {
    setting_set($lockKey, '0|0');
    session_regenerate_id(true);
    $_SESSION['auth'] = true;
    $_SESSION['csrf'] = bin2hex(random_bytes(18));
    json_out(['ok' => true, 'csrf' => $_SESSION['csrf']]);
}

// failure
$newFails = (time() - $ts) < 900 ? $fails + 1 : 1;
setting_set($lockKey, $newFails . '|' . time());
json_out(['error' => 'invalid'], 401);
