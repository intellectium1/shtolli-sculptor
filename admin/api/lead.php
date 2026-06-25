<?php
declare(strict_types=1);

/* PUBLIC endpoint: receive a lead from the site forms (quiz + contact).
   CORS-allowed for both domains; rate-limited per IP; honeypot; validates. */

require __DIR__ . '/_bootstrap.php';

$allow = ['https://shtolli.ru', 'https://www.shtolli.ru', 'https://shtolli.art', 'https://www.shtolli.art'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allow, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 600');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(['error' => 'method'], 405);
}

$pdo = db();
$ip  = client_ip();

// --- per-IP rate limit: max 8 / 10 min window ---
$row = (function () use ($pdo, $ip) {
    $s = $pdo->prepare('SELECT cnt, window_start FROM lead_throttle WHERE ip = ?');
    $s->execute([$ip]);
    return $s->fetch();
})();
if ($row) {
    $age = time() - strtotime((string) $row['window_start']);
    if ($age > 600) {
        $pdo->prepare('UPDATE lead_throttle SET cnt = 1, window_start = NOW() WHERE ip = ?')->execute([$ip]);
    } elseif ((int) $row['cnt'] >= 8) {
        json_out(['error' => 'rate_limited'], 429);
    } else {
        $pdo->prepare('UPDATE lead_throttle SET cnt = cnt + 1 WHERE ip = ?')->execute([$ip]);
    }
} else {
    $pdo->prepare('INSERT INTO lead_throttle (ip, cnt, window_start) VALUES (?, 1, NOW())')->execute([$ip]);
}

$d = body_json();
if (!$d && !empty($_POST)) {
    $d = $_POST;
}

// honeypot — bots fill everything; legit forms never send these
if (!empty($d['hp']) || !empty($d['website']) || !empty($d['url'])) {
    json_out(['ok' => true]); // silently accept-drop
}

$name     = clean_str($d['name'] ?? '', 200);
$contact  = clean_str($d['contact'] ?? '', 255);
$comment  = clean_str($d['comment'] ?? ($d['message'] ?? ''), 4000);
$type     = clean_str($d['type'] ?? '', 160);
$material = clean_str($d['material'] ?? '', 80);
$size     = clean_str($d['size'] ?? '', 120);
$timeline = clean_str($d['timeline'] ?? '', 120);
$srcRaw   = clean_str($d['source'] ?? 'contact', 40);
$source   = (stripos($srcRaw, 'квиз') !== false || stripos($srcRaw, 'quiz') !== false) ? 'quiz' : 'contact';

if ($name === '' && $contact === '' && $comment === '') {
    json_out(['error' => 'empty'], 422);
}

$ins = $pdo->prepare(
    'INSERT INTO leads (source, name, contact, type, material, size, timeline, comment, status, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, \'new\', ?)'
);
$ins->execute([$source, $name, $contact, $type, $material, $size, $timeline, $comment, $ip]);
$id = (int) $pdo->lastInsertId();

// Telegram notify (no-op until configured)
notify_telegram_lead($name, $contact, $source, $type, $comment);

json_out(['ok' => true, 'id' => $id]);

function notify_telegram_lead(string $name, string $contact, string $source, string $type, string $comment): void
{
    $tg = shtolli_config()['telegram'] ?? [];
    if (empty($tg['bot_token']) || empty($tg['chat_id'])) {
        return;
    }
    $label = $source === 'quiz' ? 'Квиз-расчёт' : 'Форма контактов';
    $text  = "🔔 Новая заявка ({$label})\n"
           . "Имя: " . ($name ?: '—') . "\n"
           . "Контакт: " . ($contact ?: '—') . "\n"
           . ($type ? "Что нужно: {$type}\n" : '')
           . ($comment ? "Комментарий: " . mb_substr($comment, 0, 500) . "\n" : '')
           . "→ shtolli.ru/admin.html";
    $payload = json_encode(['chat_id' => $tg['chat_id'], 'text' => $text], JSON_UNESCAPED_UNICODE);
    $ctx = stream_context_create([
        'http' => ['method' => 'POST', 'header' => "Content-Type: application/json\r\n", 'content' => $payload, 'timeout' => 4, 'ignore_errors' => true],
    ]);
    @file_get_contents('https://api.telegram.org/bot' . $tg['bot_token'] . '/sendMessage', false, $ctx);
}
