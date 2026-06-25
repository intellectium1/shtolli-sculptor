<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_auth();
$pdo = db();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    $status = clean_str($_GET['status'] ?? '', 20);
    if ($status !== '' && in_array($status, ['new', 'converted', 'spam'], true)) {
        $s = $pdo->prepare('SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC LIMIT 500');
        $s->execute([$status]);
    } else {
        $s = $pdo->query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500');
    }
    $counts = $pdo->query("SELECT status, COUNT(*) c FROM leads GROUP BY status")->fetchAll();
    json_out(['leads' => $s->fetchAll(), 'counts' => $counts]);
}

require_csrf();
$d      = body_json();
$action = clean_str($d['action'] ?? '', 20);
$id     = (int) ($d['lead_id'] ?? 0);
if (!$id) {
    json_out(['error' => 'no_id'], 422);
}
$s = $pdo->prepare('SELECT * FROM leads WHERE id = ?');
$s->execute([$id]);
$lead = $s->fetch();
if (!$lead) {
    json_out(['error' => 'not_found'], 404);
}

if ($action === 'spam') {
    $pdo->prepare("UPDATE leads SET status = 'spam' WHERE id = ?")->execute([$id]);
    json_out(['ok' => true]);
}
if ($action === 'delete') {
    $pdo->prepare('DELETE FROM leads WHERE id = ?')->execute([$id]);
    json_out(['ok' => true]);
}
if ($action === 'convert') {
    if ($lead['status'] === 'converted') {
        json_out(['error' => 'already'], 409);
    }
    // parse the free-form contact into phone/email/telegram
    $c = trim((string) $lead['contact']);
    $email = $phone = $tg = '';
    if ($c !== '') {
        if (filter_var($c, FILTER_VALIDATE_EMAIL)) {
            $email = $c;
        } elseif (str_starts_with($c, '@') || stripos($c, 't.me/') !== false) {
            $tg = $c;
        } elseif (preg_match('/^[\d\s()+\-]{6,}$/', $c)) {
            $phone = $c;
        } else {
            $phone = $c;
        }
    }
    $pdo->beginTransaction();
    try {
        $ic = $pdo->prepare('INSERT INTO clients (name, phone, email, telegram, source, notes) VALUES (?, ?, ?, ?, ?, ?)');
        $ic->execute([
            $lead['name'] !== '' ? $lead['name'] : 'Без имени',
            $phone ?: null, $email ?: null, $tg ?: null,
            $lead['source'], $lead['comment'] ?: null,
        ]);
        $clientId = (int) $pdo->lastInsertId();

        $title = $lead['type'] !== '' ? $lead['type'] : 'Заявка с сайта';
        $ip = $pdo->prepare('INSERT INTO projects (client_id, title, type, material, size, stage, comment) VALUES (?, ?, ?, ?, ?, \'new\', ?)');
        $ip->execute([$clientId, $title, $lead['type'] ?: null, $lead['material'] ?: null, $lead['size'] ?: null, $lead['comment'] ?: null]);
        $projId = (int) $pdo->lastInsertId();
        $pdo->prepare('INSERT INTO project_history (project_id, stage) VALUES (?, \'new\')')->execute([$projId]);

        $pdo->prepare("UPDATE leads SET status = 'converted', client_id = ? WHERE id = ?")->execute([$clientId, $id]);
        $pdo->commit();
    } catch (Throwable $e) {
        $pdo->rollBack();
        json_out(['error' => 'convert_failed'], 500);
    }
    json_out(['ok' => true, 'client_id' => $clientId, 'project_id' => $projId]);
}

json_out(['error' => 'unknown_action'], 400);
