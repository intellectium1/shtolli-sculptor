<?php
declare(strict_types=1);

/* ШТОЛЛИ admin API — shared bootstrap: config, PDO, session, CSRF, helpers. */

function shtolli_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }
    $path = getenv('SHTOLLI_CONFIG') ?: '';
    if (!$path) {
        $dr = $_SERVER['DOCUMENT_ROOT'] ?? '';
        if ($dr) {
            $path = dirname($dr, 2) . '/shtolli-config.php'; // .../data/www/<domain> -> .../data
        }
    }
    if (!$path || !is_file($path)) {
        $path = __DIR__ . '/../../../../shtolli-config.php';
    }
    if (!is_file($path)) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'config_missing']);
        exit;
    }
    $cfg = require $path;
    return $cfg;
}

function docroot(): string
{
    $dr = $_SERVER['DOCUMENT_ROOT'] ?? '';
    return $dr ?: dirname(__DIR__, 2); // admin/api -> docroot
}

function cfg_path(string $key, string $default): string
{
    $p = shtolli_config()['paths'][$key] ?? null;
    return $p ?: $default;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo) {
        return $pdo;
    }
    $c = shtolli_config()['db'];
    $dsn = "mysql:host={$c['host']};dbname={$c['name']};charset=utf8mb4";
    $pdo = new PDO($dsn, $c['user'], $c['pass'], [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    return $pdo;
}

function json_out(mixed $data, int $code = 200): never
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function body_json(): array
{
    $raw = file_get_contents('php://input');
    $d = json_decode($raw ?: '[]', true);
    return is_array($d) ? $d : [];
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_name('shtolli_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path'     => '/',
        'httponly' => true,
        'secure'   => true,
        'samesite' => 'Strict',
    ]);
    session_start();
}

function is_auth(): bool
{
    start_session();
    return !empty($_SESSION['auth']);
}

function require_auth(): void
{
    if (!is_auth()) {
        json_out(['error' => 'unauthorized'], 401);
    }
}

function csrf_token(): string
{
    start_session();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(18));
    }
    return $_SESSION['csrf'];
}

function require_csrf(): void
{
    start_session();
    $t = $_SERVER['HTTP_X_CSRF'] ?? '';
    if (empty($_SESSION['csrf']) || !is_string($t) || !hash_equals($_SESSION['csrf'], $t)) {
        json_out(['error' => 'csrf'], 403);
    }
}

function client_ip(): string
{
    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if ($xff !== '') {
        return trim(explode(',', $xff)[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '';
}

function setting_get(string $k, ?string $default = null): ?string
{
    $s = db()->prepare('SELECT v FROM settings WHERE k = ?');
    $s->execute([$k]);
    $v = $s->fetchColumn();
    return $v === false ? $default : (string) $v;
}

function setting_set(string $k, string $v): void
{
    $s = db()->prepare('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)');
    $s->execute([$k, $v]);
}

/** Trim + cap a scalar string field from untrusted input. */
function clean_str(mixed $v, int $max = 1000): string
{
    $s = is_string($v) ? $v : '';
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F]/u', '', $s) ?? '';
    $s = trim($s);
    if (mb_strlen($s) > $max) {
        $s = mb_substr($s, 0, $max);
    }
    return $s;
}
