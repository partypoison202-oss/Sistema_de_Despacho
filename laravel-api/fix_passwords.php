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
    'asistencias_t6',
];

// Fuente de verdad: idéntico al RbacMatrizSeeder.php
// [usuario => [contraseña, [módulos], rol_codigo]]
$usuarios = [
    // ── Administrador ──
    'Enrique_Hernandez' => ['HHE_A26',  $TODOS, 'ADMINISTRADOR'],
    'Jeanet_Garcia'     => ['GCJ_A26',  $TODOS, 'ADMINISTRADOR'],
    'Israel_Moreno'     => ['MGI_A26',  $TODOS, 'ADMINISTRADOR'],
    'Luis_Vargas'       => ['VGL_A26',  $TODOS, 'ADMINISTRADOR'],

    // ── Lectura ──
    'Humberto_Cabrera'  => ['CRH_L26',  $TODOS, 'LECTURA'],
    'Miguel_Monzalvo'   => ['MMM_L26',  $TODOS, 'LECTURA'],
    'Jose_Montiel'      => ['MBJ_L26',  $TODOS, 'LECTURA'],

    // ── Programación y Logística ──
    'Daniel_Luna'       => ['LCD_PY26',  ['capturista'], 'PROGRAMACION'],
    'Mario_Lazcano'     => ['LAM_PY26',  ['capturista', 'relevos'], 'PROGRAMACION'],
    'Jorge_Leal'        => ['LRJ_PY26',  ['capturista', 'relevos'], 'PROGRAMACION'],

    // ── Control de personas conductoras ──
    'Omar_Aviles'       => ['ALO_CD26',  ['operadores'], 'GESTOR_OPERADORES'],

    // ── Despacho Perfil Mixto ──
    'Miguel_Odon'       => ['OM_DD26',   ['operadores', 'despacho'], 'DESPACHO'],

    // ── Despacho de unidades ──
    'Fausto_Valdez'     => ['VTF_DD26',  ['despacho'], 'DESPACHO'],
    'Fernando_Ramos'    => ['RLF_DD26',  ['despacho'], 'DESPACHO'],
    'Marino_Roman'      => ['RVM_DD26',  ['despacho'], 'DESPACHO'],
    'Cesar_Jimenez'     => ['JC_DD26',   ['despacho'], 'DESPACHO'],
    'Guadalupe_Santos'  => ['SCG_DD26',  ['despacho'], 'DESPACHO'],
    'Ivan_Martinez'     => ['MAI_DD26',  ['maniobristas', 'operadores'], 'GESTOR_OPERADORES'],
    'Jairo_Jimenez'     => ['JRJ_DD26',  ['despacho'], 'DESPACHO'],
    'Bacilio_Tapia'     => ['TPB_DD26',  ['despacho'], 'DESPACHO'],

    // ── Mantenimiento Expandido ──
    'Erick_Herrera'     => ['HCE_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],
    'Otoniel_Perez'     => ['PMO_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],

    // ── Monitoreo e Inspección (Centro Control) ──
    'Bonifacio_Alpizar' => ['ALB_ME26',  ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista'], 'CENTRO_CONTROL'],
    'Diana_Vazquez'     => ['VGD_ME26',  ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista'], 'CENTRO_CONTROL'],
    'Emilio_Corona'     => ['CME_ME26',  ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista'], 'CENTRO_CONTROL'],

    // ── Mantenimiento ──
    'Gabriel_Garcia'    => ['GGV_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],
    'Jorge_Nava'        => ['NVJ_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],
    'Cesar_Badillo'     => ['BMC_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],
    'Ramon_Bautista'    => ['BRR_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],
    'Edgar_Gomez'       => ['GGE_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],
    'Adrian_Isidro'     => ['ILA_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],
    'Raquel_Aguilar'    => ['ARR_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],
    'Karen_Rodriguez'   => ['RBK_ME26',  ['mantenimiento', 'encierro', 'carga_combustible'], 'MANTENIMIENTO'],

    // ── Mesa de Control ──
    'Angelica_Gonzalez' => ['GSA_MC26',  ['centro_control','mesa_control','relevos'], 'MESA_CONTROL'],

    // ── Encierro ──
    'Jose_Angeles'      => ['AMJ_EN26',  ['encierro'], 'ENCIERRO'],

    // ── Pasteles ──
    'Ricardo_Macias'    => ['MVR_PL26',  ['centro_control','mesa_control','programacion_pasteles'], 'PASTELES'],
    'Victor_Alonso'     => ['AGV_PL26',  ['centro_control','mesa_control','programacion_pasteles'], 'PASTELES'],
];

// Mapear códigos de rol a sus IDs en la base de datos
$rolesMap = [];
$stmtRoles = $pdo->query("SELECT id, codigo FROM roles");
while ($row = $stmtRoles->fetch(PDO::FETCH_ASSOC)) {
    $rolesMap[$row['codigo']] = $row['id'];
}

$ok = 0;
$noEncontrado = 0;

foreach ($usuarios as $usuario => [$contrasena, $modulos, $rol_codigo]) {
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = :usuario");
    $stmt->execute([':usuario' => $usuario]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo "❌ Usuario no encontrado: $usuario\n";
        $noEncontrado++;
        continue;
    }

    $userId = $user['id'];
    $rolId = $rolesMap[$rol_codigo] ?? null;

    // 1. Actualizar contraseña (hash nativo PHP) Y rol
    $hashed = password_hash($contrasena, PASSWORD_BCRYPT);
    if ($rolId) {
        $stmtUpdate = $pdo->prepare("UPDATE usuarios SET contrasena = :pass, rol_id = :rol_id, activo = true WHERE id = :id");
        $stmtUpdate->execute([':pass' => $hashed, ':rol_id' => $rolId, ':id' => $userId]);
    } else {
        $stmtUpdate = $pdo->prepare("UPDATE usuarios SET contrasena = :pass, activo = true WHERE id = :id");
        $stmtUpdate->execute([':pass' => $hashed, ':id' => $userId]);
        echo "⚠️ Rol no encontrado ($rol_codigo) para $usuario, solo se actualizó la contraseña.\n";
    }

    // 2. Limpiar módulos existentes
    $stmtDel = $pdo->prepare("DELETE FROM usuario_modulos WHERE usuario_id = :id");
    $stmtDel->execute([':id' => $userId]);

    // 3. Insertar módulos correctos
    foreach ($modulos as $mod) {
        $stmtIns = $pdo->prepare("INSERT INTO usuario_modulos (usuario_id, modulo_codigo, created_at, updated_at) VALUES (:uid, :mod, NOW(), NOW())");
        $stmtIns->execute([':uid' => $userId, ':mod' => $mod]);
    }

    echo "✅ $usuario -> Contraseña, Rol ($rol_codigo) y Módulos (" . count($modulos) . ") sincronizados.\n";
    $ok++;
}

echo "\n========================================\n";
echo "Actualizados: $ok | No encontrados: $noEncontrado\n";
echo "========================================\n";
echo "\n⚠️  Borra este archivo: rm fix_passwords.php\n";
echo "⚠️  Reconstruye frontend: cd ../frontend && npm run build\n";
