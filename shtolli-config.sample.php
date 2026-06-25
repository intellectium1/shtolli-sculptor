<?php
// ШТОЛЛИ — runtime config TEMPLATE.
// The REAL copy lives ABOVE webroot (e.g. /var/www/u3552677/data/shtolli-config.php)
// and is NEVER committed. This sample documents the shape only.
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'u3552677_default',
        'user' => 'u3552677_default',
        'pass' => 'CHANGE_ME',
    ],
    // random app secret (CSRF/session entropy)
    'app_secret'  => 'CHANGE_ME',
    // one-time setup token; blank it after setup has run
    'setup_token' => 'CHANGE_ME',
    // Telegram lead alerts (optional)
    'telegram' => [
        'bot_token' => '',
        'chat_id'   => '',
    ],
    // absolute server paths; null = derive from DOCUMENT_ROOT
    'paths' => [
        'gallery_json' => null, // docroot/assets/gallery.json
        'gallery_dir'  => null, // docroot/assets/img/gallery
        'uploads_dir'  => null, // docroot/assets/img/uploads
    ],
];
