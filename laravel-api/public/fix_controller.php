<?php
$file = __DIR__ . '/../app/Http/Controllers/API/DespachoController.php';
$lines = file($file);
$startIndex = -1;
$endIndex = -1;

foreach ($lines as $index => $line) {
    if (strpos($line, 'actualizarMananaDuplicada') !== false) {
        $startIndex = $index;
    }
    if ($startIndex !== -1 && strpos($line, 'actualizarAdicionales') !== false) {
        $endIndex = $index - 1;
        break;
    }
}

if ($startIndex !== -1 && $endIndex !== -1) {
    while (trim($lines[$endIndex]) === '') {
        $endIndex--;
    }
    
    $length = $endIndex - $startIndex + 1;
    array_splice($lines, $startIndex, $length);
    file_put_contents($file, implode('', $lines));
    
    // Delete this script after execution
    unlink(__FILE__);
    
    echo "Removed $length lines starting at index $startIndex.";
} else {
    echo "Start: $startIndex, End: $endIndex";
}
