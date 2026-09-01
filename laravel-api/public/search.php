<?php
$file = 'c:\\Users\\Luis Vargas\\Documents\\Sistema_de_Despacho\\laravel-api\\app\\Http\\Controllers\\API\\DespachoController.php';
$lines = file($file);
foreach ($lines as $i => $line) {
    if (stripos($line, 'cambiarEstatus') !== false) {
        echo "Found at line " . ($i + 1) . ": $line\n";
    }
}
