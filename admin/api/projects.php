<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_auth();
$pdo = db();

const STAGES = ['new', 'consult', 'design', 'contract', 'production', 'finishing', 'done'];

function num_or_null(mixed $v): ?string
{
    if ($v === null || $v === '') {
        return null;
    }
    $f = filter_var($v, FILTER_VALIDATE_FLOAT);
    return $f === false ? null : (string) $f;
}

function date_or_null(mixed $v): ?string
{
    $s = is_string($v) ? trim($v) : '';
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) ? $s : null;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id) {
        $s = $pdo->prepare(
            'SELECT p.*, c.name client_name, c.phone client_phone, c.email client_email, c.telegram client_telegram
             FROM projects p JOIN clients c ON c.id = p.client_id WHERE p.id = ?'
        );
        $s->execute([$id]);
        $proj = $s->fetch();
        if (!$proj) {
            json_out(['error' => 'not_found'], 404);
        }
        $n = $pdo->prepare('SELECT * FROM project_notes WHERE project_id = ? ORDER BY created_at DESC');
        $n->execute([$id]);
        $h = $pdo->prepare('SELECT * FROM project_history WHERE project_id = ? ORDER BY created_at ASC');
        $h->execute([$id]);
        $f = $pdo->prepare('SELECT * FROM project_files WHERE project_id = ? ORDER BY created_at DESC');
        $f->execute([$id]);
        $proj['notes']   = $n->fetchAll();
        $proj['history'] = $h->fetchAll();
        $proj['files']   = $f->fetchAll();
        json_out(['project' => $proj]);
    }
    // board: active projects with client name
    $s = $pdo->query(
        "SELECT p.*, c.name client_name FROM projects p JOIN clients c ON c.id = p.client_id
         WHERE p.status = 'active' ORDER BY p.updated_at DESC LIMIT 1000"
    );
    json_out(['projects' => $s->fetchAll(), 'stages' => STAGES]);
}

require_csrf();
$d      = body_json();
$action = clean_str($d['action'] ?? '', 20);

if ($action === 'create') {
    $clientId = (int) ($d['client_id'] ?? 0);
    if (!$clientId) {
        json_out(['error' => 'client_required'], 422);
    }
    $title = clean_str($d['title'] ?? '', 255) ?: 'Проект';
    $stage = in_array($d['stage'] ?? '', STAGES, true) ? $d['stage'] : 'new';
    $s = $pdo->prepare(
        'INSERT INTO projects (client_id, title, type, material, size, stage, deadline, price, prepaid, comment)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $s->execute([
        $clientId, $title,
        clean_str($d['type'] ?? '', 120) ?: null,
        clean_str($d['material'] ?? '', 80) ?: null,
        clean_str($d['size'] ?? '', 120) ?: null,
        $stage,
        date_or_null($d['deadline'] ?? null),
        num_or_null($d['price'] ?? null),
        num_or_null($d['prepaid'] ?? null),
        clean_str($d['comment'] ?? '', 5000) ?: null,
    ]);
    $pid = (int) $pdo->lastInsertId();
    $pdo->prepare('INSERT INTO project_history (project_id, stage) VALUES (?, ?)')->execute([$pid, $stage]);
    json_out(['ok' => true, 'id' => $pid]);
}

$id = (int) ($d['id'] ?? 0);
if (!$id) {
    json_out(['error' => 'no_id'], 422);
}

if ($action === 'move') {
    $stage = $d['stage'] ?? '';
    if (!in_array($stage, STAGES, true)) {
        json_out(['error' => 'bad_stage'], 422);
    }
    $pdo->prepare('UPDATE projects SET stage = ? WHERE id = ?')->execute([$stage, $id]);
    $pdo->prepare('INSERT INTO project_history (project_id, stage) VALUES (?, ?)')->execute([$id, $stage]);
    json_out(['ok' => true]);
}

if ($action === 'update') {
    $fields = [];
    $vals   = [];
    foreach (['title' => 255, 'type' => 120, 'material' => 80, 'size' => 120, 'comment' => 5000] as $k => $max) {
        if (array_key_exists($k, $d)) {
            $fields[] = "$k = ?";
            $vals[]   = clean_str($d[$k], $max) ?: null;
        }
    }
    if (array_key_exists('deadline', $d)) { $fields[] = 'deadline = ?'; $vals[] = date_or_null($d['deadline']); }
    if (array_key_exists('price', $d))    { $fields[] = 'price = ?';    $vals[] = num_or_null($d['price']); }
    if (array_key_exists('prepaid', $d))  { $fields[] = 'prepaid = ?';  $vals[] = num_or_null($d['prepaid']); }
    if (array_key_exists('status', $d) && in_array($d['status'], ['active', 'done', 'archived'], true)) {
        $fields[] = 'status = ?'; $vals[] = $d['status'];
    }
    if (!$fields) {
        json_out(['ok' => true]);
    }
    $vals[] = $id;
    $pdo->prepare('UPDATE projects SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($vals);
    json_out(['ok' => true]);
}

if ($action === 'delete') {
    $pdo->prepare('DELETE FROM projects WHERE id = ?')->execute([$id]);
    json_out(['ok' => true]);
}
json_out(['error' => 'unknown_action'], 400);
