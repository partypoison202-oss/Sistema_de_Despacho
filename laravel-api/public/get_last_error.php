<?php
$logPath = __DIR__ . '/../storage/logs/laravel.log';
if (!file_exists($logPath)) {
    die("Log file not found");
}

$lines = file($logPath);
$errors = array_filter($lines, function($line) {
    return strpos($line, 'local.ERROR') !== false || strpos($line, 'SQLSTATE') !== false;
});

echo "Last 5 errors:\n";
print_r(array_slice($errors, -5));
