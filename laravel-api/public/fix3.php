<?php
$file = __DIR__ . '/../app/Http/Controllers/API/DespachoController.php';
if (!file_exists($file)) {
    echo "File not found: " . realpath($file);
    exit;
}
$lines = file($file);
echo "File has " . count($lines) . " lines. \n";
$found = [];
foreach ($lines as $index => $line) {
    if (strpos($line, 'actualizar') !== false) {
        $found[] = $index . ': ' . trim($line);
    }
}
echo "Lines containing 'actualizar':\n" . implode("\n", $found);
