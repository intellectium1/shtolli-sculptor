<?php
declare(strict_types=1);
require __DIR__ . '/_bootstrap.php';
require_auth();
$pdo = db();

$what = clean_str($_GET['what'] ?? '', 20);
$fmt  = clean_str($_GET['fmt'] ?? 'json', 10);
$map  = [
    'clients'  => 'SELECT id,name,phone,email,telegram,source,notes,archived,created_at,updated_at FROM clients ORDER BY id',
    'leads'    => 'SELECT id,source,name,contact,type,material,size,timeline,comment,status,created_at FROM leads ORDER BY id',
    'projects' => 'SELECT p.id,c.name client,p.title,p.type,p.material,p.size,p.stage,p.deadline,p.price,p.prepaid,p.status,p.created_at FROM projects p JOIN clients c ON c.id=p.client_id ORDER BY p.id',
];
if (!isset($map[$what])) {
    json_out(['error' => 'bad_what'], 422);
}
$rows = $pdo->query($map[$what])->fetchAll();
$stamp = date('Ymd_His');

if ($fmt === 'csv') {
    header('Content-Type: text/csv; charset=utf-8');
    header("Content-Disposition: attachment; filename=\"shtolli_{$what}_{$stamp}.csv\"");
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF"); // BOM for Excel
    if ($rows) {
        fputcsv($out, array_keys($rows[0]));
        foreach ($rows as $r) {
            fputcsv($out, $r);
        }
    }
    fclose($out);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header("Content-Disposition: attachment; filename=\"shtolli_{$what}_{$stamp}.json\"");
echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
