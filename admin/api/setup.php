<?php
declare(strict_types=1);

/* One-time setup: create schema, harden upload dirs, generate admin password.
   Token-guarded (token in config). Idempotent. Blank the token after running. */

require __DIR__ . '/_bootstrap.php';
header('Content-Type: text/plain; charset=utf-8');

$cfg   = shtolli_config();
$token = $_GET['token'] ?? '';
if (empty($cfg['setup_token']) || !is_string($token) || !hash_equals((string) $cfg['setup_token'], $token)) {
    http_response_code(403);
    echo "forbidden\n";
    exit;
}

$pdo = db();

// 1) schema
$schemaPath = docroot() . '/db/schema.sql';
if (!is_file($schemaPath)) {
    echo "schema.sql missing at {$schemaPath}\n";
    exit;
}
$sql   = (string) file_get_contents($schemaPath);
$count = 0;
foreach (explode(';', $sql) as $st) {
    $code = trim((string) preg_replace('/^\s*--.*$/m', '', $st));
    if ($code === '') {
        continue;
    }
    $pdo->exec($st);
    $count++;
}
echo "schema: executed {$count} statements\n";

// 2) upload dirs + no-exec hardening
$noExec = "RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .phps\n"
        . "RemoveType .php .phtml\n"
        . "<FilesMatch \"\\.(php|phtml|phar|phps|cgi|pl)$\">\n  Require all denied\n</FilesMatch>\n"
        . "Options -ExecCGI -Indexes\n";
foreach ([cfg_path('gallery_dir', docroot() . '/assets/img/gallery'),
          cfg_path('uploads_dir', docroot() . '/assets/img/uploads')] as $dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    if (is_dir($dir)) {
        @file_put_contents($dir . '/.htaccess', $noExec);
    }
    echo 'dir ' . (is_dir($dir) ? 'ok' : 'FAIL') . ": {$dir}\n";
}

// 3) admin password — generate once
if (setting_get('admin_hash') === null) {
    $pw = bin2hex(random_bytes(8)); // 16 hex chars
    setting_set('admin_hash', password_hash($pw, PASSWORD_BCRYPT));
    setting_set('setup_done_at', date('c'));
    echo "admin_password_GENERATED: {$pw}\n";
    echo "(save it now; you can change it later in the admin panel)\n";
} else {
    echo "admin password already set (unchanged)\n";
}

// 4) report
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
echo 'tables: ' . implode(', ', $tables) . "\n";
echo "DONE\n";
