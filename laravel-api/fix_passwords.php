<?php
/**
 * Script temporal para actualizar contraseñas Y módulos en producción.
 * Ejecutar con: php fix_passwords.php
 * BORRAR ESTE ARCHIVO después de ejecutarlo: rm fix_passwords.php
 */

$envFile = __DIR__ . '/.env';
if (!file_exists($envFile)) die("No se encontró el archivo .env\n");

$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$env = [];
foreach ($lines as $line) {
    if (str_starts_with(trim($line), '#')) continue;
    if (!str_contains($line, '=')) continue;
    [$key, $value] = explode('=', $line, 2);
    $env[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
}

$dsn = sprintf(
    'pgsql:host=%s;port=%s;dbname=%s;sslmode=%s',
    $env['DB_HOST'] ?? '127.0.0.1',
    $env['DB_PORT'] ?? '5432',
    $env['DB_DATABASE'] ?? 'sistema_despacho_prod',
    $env['DB_SSLMODE'] ?? 'disable'
);

try {
    $pdo = new PDO($dsn, $env['DB_USERNAME'], $env['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (Exception $e) {
    die("Error de conexión: " . $e->getMessage() . "\n");
}

echo "✅ Conexión exitosa a: " . ($env['DB_DATABASE'] ?? '?') . "\n\n";

$TODOS = [
    'despacho','encierro','capturista','relevos','mantenimiento',
    'centro_control','historial','titan','infraccion','mesa_control',
    'operadores','maniobristas','carga_combustible','general','programacion_pasteles',
];

// Fuente de verdad: idéntico al RbacMatrizSeeder.php
// [usuario => [contraseña, [módulos]]]
$usuarios = [
    // ── Administrador ──
    'Enrique_Hernandez' => ['HHE_A26',  $TODOS],
    'Jeanet_Garcia'     => ['GCJ_A26',  $TODOS],
    'Israel_Moreno'     => ['MGI_A26',  $TODOS],
    'Luis_Vargas'       => ['VGL_A26',  $TODOS],

    // ── Lectura ──
    'Humberto_Cabrera'  => ['CRH_L26',  $TODOS],
    'Miguel_Monzalvo'   => ['MMM_L26',  $TODOS],
    'Jose_Montiel'      => ['MBJ_L26',  $TODOS],

    // ── Programación y Logística ──
    'Daniel_Luna'       => ['LCD_PY26',  ['capturista']],
    'Mario_Lazcano'     => ['LAM_PY26',  ['capturista']],
    'Jorge_Leal'        => ['LRJ_PY26',  ['capturista']],

    // ── Control de personas conductoras ──
    'Omar_Aviles'       => ['ALO_CD26',  ['operadores']],

    // ── Despacho Perfil Mixto ──
    'Miguel_Odon'       => ['OM_DD26',   ['operadores', 'despacho']],

    // ── Despacho de unidades ──
    'Fausto_Valdez'     => ['VTF_DD26',  ['despacho']],
    'Fernando_Ramos'    => ['RLF_DD26',  ['despacho']],
    'Marino_Roman'      => ['RVM_DD26',  ['despacho']],
    'Cesar_Jimenez'     => ['JC_DD26',   ['despacho']],
    'Guadalupe_Santos'  => ['SCG_DD26',  ['despacho']],
    'Ivan_Martinez'     => ['MAI_DD26',  ['maniobristas', 'operadores']],
    'Jairo_Jimenez'     => ['JRJ_DD26',  ['despacho']],
    'Bacilio_Tapia'     => ['TPB_DD26',  ['despacho']],

    // ── Mantenimiento Expandido ──
    'Erick_Herrera'     => ['HCE_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],
    'Otoniel_Perez'     => ['PMO_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],

    // ── Monitoreo e Inspección (Centro Control) ──
    'Bonifacio_Alpizar' => ['ALB_ME26',  ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Diana_Vazquez'     => ['VGD_ME26',  ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Emilio_Corona'     => ['CME_ME26',  ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],

    // ── Mantenimiento ──
    'Gabriel_Garcia'    => ['GGV_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],
    'Jorge_Nava'        => ['NVJ_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],
    'Cesar_Badillo'     => ['BMC_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],
    'Ramon_Bautista'    => ['BRR_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],
    'Edgar_Gomez'       => ['GGE_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],
    'Adrian_Isidro'     => ['ILA_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],
    'Raquel_Aguilar'    => ['ARR_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],
    'Karen_Rodriguez'   => ['RBK_ME26',  ['mantenimiento', 'encierro', 'carga_combustible']],

    // ── Mesa de Control ──
    'Angelica_Gonzalez' => ['GSA_MC26',  ['centro_control','mesa_control','relevos']],

    // ── Encierro ──
    'Jose_Angeles'      => ['AMJ_EN26',  ['encierro']],

    // ── Pasteles ──
    'Ricardo_Macias'    => ['MVR_PL26',  ['centro_control','mesa_control','programacion_pasteles']],
    'Victor_Alonso'     => ['AGV_PL26',  ['centro_control','mesa_control','programacion_pasteles']],
];

$ok = 0;
$noEncontrado = 0;

foreach ($usuarios as $usuario => [$contrasena, $modulos]) {
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = :usuario");
    $stmt->execute([':usuario' => $usuario]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo "❌ $usuario => NO ENCONTRADO\n";
        $noEncontrado++;
        continue;
    }

    $userId = $user['id'];
    $hash   = password_hash($contrasena, PASSWORD_BCRYPT, ['cost' => 12]);

    $pdo->prepare("UPDATE usuarios SET contrasena = :hash, activo = true WHERE id = :id")
        ->execute([':hash' => $hash, ':id' => $userId]);

    $pdo->prepare("DELETE FROM usuario_modulos WHERE usuario_id = :uid")
        ->execute([':uid' => $userId]);

    foreach ($modulos as $modulo) {
        $pdo->prepare("INSERT INTO usuario_modulos (usuario_id, modulo_codigo) VALUES (:uid, :mod)")
            ->execute([':uid' => $userId, ':mod' => $modulo]);
    }

    echo "✅ $usuario | pass: $contrasena | módulos: " . implode(', ', $modulos) . "\n";
    $ok++;
}

echo "\n========================================\n";
echo "Actualizados: $ok | No encontrados: $noEncontrado\n";
echo "========================================\n";
echo "\n⚠️  Borra este archivo: rm fix_passwords.php\n";
echo "⚠️  Reconstruye frontend: cd ../frontend && npm run build\n";
