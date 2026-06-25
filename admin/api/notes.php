<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_auth();
require_csrf();
$pdo = db();
$d   = body_json();

$action = clean_str($d['action'] ?? 'add', 20);
if ($action === 'add') {
    $pid  = (int) ($d['project_id'] ?? 0);
    $text = clean_str($d['text'] ?? '', 5000);
    if (!$pid || $text === '') {
        json_out(['error' => 'bad_input'], 422);
    }
    $ok = $pdo->prepare('SELECT 1 FROM projects WHERE id = ?');
    $ok->execute([$pid]);
    if (!$ok->fetchColumn()) {
        json_out(['error' => 'no_project'], 404);
    }
    $pdo->prepare('INSERT INTO project_notes (project_id, text) VALUES (?, ?)')->execute([$pid, $text]);
    json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}
if ($action === 'delete') {
    $id = (int) ($d['id'] ?? 0);
    if ($id) {
        $pdo->prepare('DELETE FROM project_notes WHERE id = ?')->execute([$id]);
    }
    json_out(['ok' => true]);
}
json_out(['error' => 'unknown_action'], 400);
