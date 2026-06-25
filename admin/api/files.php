<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_auth();
$pdo     = db();
$uploads = cfg_path('uploads_dir', dirname(docroot(), 2) . '/uploads'); // ABOVE webroot — private

// GET ?id= : serve a private file (admin-only)
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $id = (int) ($_GET['id'] ?? 0);
    $s  = $pdo->prepare('SELECT * FROM project_files WHERE id = ?');
    $s->execute([$id]);
    $f = $s->fetch();
    if (!$f) {
        http_response_code(404);
        exit;
    }
    $path = $uploads . '/' . basename((string) $f['filename']);
    if (!is_file($path)) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: ' . ($f['mime'] ?: 'application/octet-stream'));
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: private, max-age=300');
    header('X-Content-Type-Options: nosniff');
    readfile($path);
    exit;
}

require_csrf();

if (($_POST['action'] ?? '') === 'delete') {
    $id = (int) ($_POST['id'] ?? 0);
    $s  = $pdo->prepare('SELECT filename FROM project_files WHERE id = ?');
    $s->execute([$id]);
    $fn = $s->fetchColumn();
    if ($fn) {
        @unlink($uploads . '/' . basename((string) $fn));
        $pdo->prepare('DELETE FROM project_files WHERE id = ?')->execute([$id]);
    }
    json_out(['ok' => true]);
}

// upload
$pid = (int) ($_POST['project_id'] ?? 0);
if (!$pid) {
    json_out(['error' => 'no_project'], 422);
}
if (empty($_FILES['file']) || ($_FILES['file']['error'] ?? 1) !== UPLOAD_ERR_OK) {
    json_out(['error' => 'no_file'], 422);
}
$tmp = $_FILES['file']['tmp_name'];
if (filesize($tmp) > 15 * 1024 * 1024) {
    json_out(['error' => 'too_big'], 422);
}
$mime = (new finfo(FILEINFO_MIME_TYPE))->file($tmp);
if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
    json_out(['error' => 'bad_type'], 422);
}
$img = @imagecreatefromstring((string) file_get_contents($tmp));
if (!$img) {
    json_out(['error' => 'decode'], 422);
}
$w = imagesx($img);
$h = imagesy($img);
$scale = min(1.0, 2200 / max($w, $h));
if ($scale < 1.0) {
    $nw = (int) ($w * $scale);
    $nh = (int) ($h * $scale);
    $r  = imagecreatetruecolor($nw, $nh);
    imagecopyresampled($r, $img, 0, 0, 0, 0, $nw, $nh, $w, $h);
    imagedestroy($img);
    $img = $r;
}
if (!is_dir($uploads)) {
    @mkdir($uploads, 0775, true);
}
$name = bin2hex(random_bytes(8)) . '.webp';
imagewebp($img, $uploads . '/' . $name, 82);
imagedestroy($img);
$pdo->prepare('INSERT INTO project_files (project_id, filename, original_name, mime, size) VALUES (?, ?, ?, ?, ?)')
    ->execute([$pid, $name, clean_str($_FILES['file']['name'] ?? '', 255) ?: null, 'image/webp', filesize($uploads . '/' . $name)]);
json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId(), 'filename' => $name]);
