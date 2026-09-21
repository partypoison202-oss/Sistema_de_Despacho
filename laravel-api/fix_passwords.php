<?php
/**
 * Script temporal para actualizar contraseñas en producción.
 * Ejecutar con: php fix_passwords.php
 * BORRAR ESTE ARCHIVO después de ejecutarlo.
 */

// Cargar variables de entorno del .env de Laravel
$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) {
    die("No se encontró el archivo .env\n");
}

$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$env = [];
foreach ($lines as $line) {
    if (str_starts_with(trim($line), '#')) continue;
    if (!str_contains($line, '=')) continue;
    [$key, $value] = explode('=', $line, 2);
    $env[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
}

// Conectar a la base de datos
$dsn = sprintf(
    'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
    $env['DB_HOST'] ?? '127.0.0.1',
    $env['DB_PORT'] ?? '5432',
    $env['DB_DATABASE'] ?? 'sistema_despacho_prod',
    $env['DB_SSLMODE'] ?? 'disable'
);

try {
    $pdo = new PDO($dsn, $env['DB_USERNAME'], $env['DB_PASSWORD'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (Exception $e) {
    die("Error de conexión: " . $e->getMessage() . "\n");
}

echo "✅ Conexión exitosa a: " . ($env['DB_DATABASE'] ?? '?') . "\n\n";

// Lista de usuarios y sus contraseñas
$usuarios = [
    'Omar_Aviles'       => 'LAO_DD26',
    'Guadalupe_Santos'  => 'SCG_DD26',
    'Marino_Roman'      => 'VRM_DD26',
    'Cesar_Jimenez'     => 'JC_DD26',
    'Bacilio_Tapia'     => 'TPB_DD26',
    'Fausto_Valdez'     => 'VTF_DD26',
    'Fernando_Ramos'    => 'LRF_DD26',
    'Humberto_Cabrera'  => 'CRH_CC26',
    'Miguel_Monzalvo'   => 'MMA_CC26',
    'Jose_Montiel'      => 'MBJ_CC26',
    'Jeanet_Garcia'     => 'GCJ_CC26',
    'Israel_Moreno'     => 'MGI_CC26',
    'Luis_Vargas'       => 'VGL_CC26',
    'Daniel_Luna'       => 'LCD_CC26',
    'Mario_Lazcano'     => 'LAM_CC26',
    'Jorge_Leal'        => 'LRJ_CC26',
    'Ivan_Martinez'     => 'MAI_CC26',
    'Jairo_Jimenez'     => 'JRJ_CC26',
    'Miguel_Odon'       => 'OM_CC26',
    'Bonifacio_Alpizar' => 'ALB_ME26',
    'Diana_Vazquez'     => 'VGD_ME26',
    'Emilio_Corona'     => 'CME_ME26',
    'Gabriel_Garcia'    => 'GGV_ME26',
    'Jorge_Nava'        => 'NVJ_ME26',
    'Cesar_Badillo'     => 'BMC_ME26',
    'Ramon_Bautista'    => 'BRR_ME26',
    'Edgar_Gomez'       => 'GGE_ME26',
    'Adrian_Isidro'     => 'ILA_ME26',
    'Raquel_Aguilar'    => 'ARR_ME26',
    'Karen_Rodriguez'   => 'RBK_ME26',
    'Angelica_Gonzalez' => 'GSA_MC26',
    'Jose_Angeles'      => 'AMJ_EN26',
    'Ricardo_Macias'    => 'MVR_PL26',
    'Victor_Alonso'     => 'AGV_PL26',
    'Enrique_Hernandez' => 'HHE_AD26',
    'Erick_Herrera'     => 'HCE_AD26',
    'Otoniel_Perez'     => 'PMO_AD26',
];

$ok = 0;
$noEncontrado = 0;

foreach ($usuarios as $usuario => $contrasena) {
    // Generar hash compatible con Laravel ($2y$)
    $hash = password_hash($contrasena, PASSWORD_BCRYPT, ['cost' => 12]);

    $stmt = $pdo->prepare(
        "UPDATE usuarios SET contrasena = :hash, activo = true WHERE usuario = :usuario"
    );
    $stmt->execute([':hash' => $hash, ':usuario' => $usuario]);
    $affected = $stmt->rowCount();

    if ($affected > 0) {
        echo "✅ $usuario => OK\n";
        $ok++;
    } else {
        echo "❌ $usuario => NO ENCONTRADO en la base de datos\n";
        $noEncontrado++;
    }
}

echo "\n";
echo "========================================\n";
echo "Actualizados: $ok | No encontrados: $noEncontrado\n";
echo "========================================\n";
echo "\n⚠️  IMPORTANTE: Borra este archivo del servidor: rm fix_passwords.php\n";
