<?php
declare(strict_types=1);

/* Returns auth state + a CSRF token (for the admin app to bootstrap).
   Also lets the admin change the password (POST {action:'password', current, next}). */

require __DIR__ . '/_bootstrap.php';
start_session();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    require_auth();
    require_csrf();
    $d = body_json();
    if (($d['action'] ?? '') === 'password') {
        $cur  = is_string($d['current'] ?? null) ? $d['current'] : '';
        $next = is_string($d['next'] ?? null) ? $d['next'] : '';
        $hash = setting_get('admin_hash');
        if (!$hash || !password_verify($cur, $hash)) {
            json_out(['error' => 'wrong_current'], 403);
        }
        if (mb_strlen($next) < 8) {
            json_out(['error' => 'too_short'], 422);
        }
        setting_set('admin_hash', password_hash($next, PASSWORD_BCRYPT));
        json_out(['ok' => true]);
    }
    json_out(['error' => 'unknown_action'], 400);
}

json_out([
    'auth' => is_auth(),
    'csrf' => is_auth() ? csrf_token() : null,
]);
