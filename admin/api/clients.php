<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_auth();
$pdo = db();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id) {
        $s = $pdo->prepare('SELECT * FROM clients WHERE id = ?');
        $s->execute([$id]);
        $client = $s->fetch();
        if (!$client) {
            json_out(['error' => 'not_found'], 404);
        }
        $p = $pdo->prepare('SELECT * FROM projects WHERE client_id = ? ORDER BY created_at DESC');
        $p->execute([$id]);
        $client['projects'] = $p->fetchAll();
        json_out(['client' => $client]);
    }
    $q        = clean_str($_GET['q'] ?? '', 100);
    $archived = ($_GET['archived'] ?? '') === '1' ? 1 : 0;
    if ($q !== '') {
        $like = '%' . $q . '%';
        $s = $pdo->prepare(
            'SELECT c.*, (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) projects_count
             FROM clients c WHERE c.archived = ? AND (c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.telegram LIKE ?)
             ORDER BY c.updated_at DESC LIMIT 500'
        );
        $s->execute([$archived, $like, $like, $like, $like]);
    } else {
        $s = $pdo->prepare(
            'SELECT c.*, (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) projects_count
             FROM clients c WHERE c.archived = ? ORDER BY c.updated_at DESC LIMIT 500'
        );
        $s->execute([$archived]);
    }
    json_out(['clients' => $s->fetchAll()]);
}

require_csrf();
$d      = body_json();
$action = clean_str($d['action'] ?? '', 20);

if ($action === 'create') {
    $name = clean_str($d['name'] ?? '', 200);
    if ($name === '') {
        json_out(['error' => 'name_required'], 422);
    }
    $s = $pdo->prepare('INSERT INTO clients (name, phone, email, telegram, source, notes) VALUES (?, ?, ?, ?, ?, ?)');
    $s->execute([
        $name,
        clean_str($d['phone'] ?? '', 64) ?: null,
        clean_str($d['email'] ?? '', 200) ?: null,
        clean_str($d['telegram'] ?? '', 120) ?: null,
        clean_str($d['source'] ?? '', 40) ?: null,
        clean_str($d['notes'] ?? '', 5000) ?: null,
    ]);
    json_out(['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
}

$id = (int) ($d['id'] ?? 0);
if (!$id) {
    json_out(['error' => 'no_id'], 422);
}

if ($action === 'update') {
    $fields = [];
    $vals   = [];
    foreach (['name' => 200, 'phone' => 64, 'email' => 200, 'telegram' => 120, 'source' => 40, 'notes' => 5000] as $k => $max) {
        if (array_key_exists($k, $d)) {
            $fields[] = "$k = ?";
            $vals[]   = clean_str($d[$k], $max) ?: null;
        }
    }
    if (!$fields) {
        json_out(['ok' => true]);
    }
    $vals[] = $id;
    $pdo->prepare('UPDATE clients SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($vals);
    json_out(['ok' => true]);
}
if ($action === 'archive') {
    $pdo->prepare('UPDATE clients SET archived = ? WHERE id = ?')->execute([!empty($d['archived']) ? 1 : 0, $id]);
    json_out(['ok' => true]);
}
json_out(['error' => 'unknown_action'], 400);
