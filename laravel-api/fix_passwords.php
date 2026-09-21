<?php
/**
 * Script temporal para actualizar contraseñas Y módulos en producción.
 * Ejecutar con: php fix_passwords.php
 * BORRAR ESTE ARCHIVO después de ejecutarlo: rm fix_passwords.php
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

// Lista completa: usuario => [contraseña, [módulos]]
$usuarios = [
    // ADMINISTRADORES
    'Enrique_Hernandez' => ['HHE_AD26', ['despacho','centro_control','mesa_control','maniobristas','relevos','encierro','capturista','operadores','mantenimiento','carga_combustible','programacion_pasteles','reportes','usuarios']],
    'Erick_Herrera'     => ['HCE_AD26', ['despacho','centro_control','mesa_control','maniobristas','relevos','encierro','capturista','operadores','mantenimiento','carga_combustible','programacion_pasteles','reportes','usuarios']],
    'Otoniel_Perez'     => ['PMO_AD26', ['despacho','centro_control','mesa_control','maniobristas','relevos','encierro','capturista','operadores','mantenimiento','carga_combustible','programacion_pasteles','reportes','usuarios']],
    // DESPACHO
    'Omar_Aviles'       => ['LAO_DD26', ['despacho']],
    'Guadalupe_Santos'  => ['SCG_DD26', ['despacho']],
    'Marino_Roman'      => ['VRM_DD26', ['despacho']],
    'Cesar_Jimenez'     => ['JC_DD26',  ['despacho']],
    'Bacilio_Tapia'     => ['TPB_DD26', ['despacho']],
    'Fausto_Valdez'     => ['VTF_DD26', ['despacho']],
    'Fernando_Ramos'    => ['LRF_DD26', ['despacho']],
    // CENTRO CONTROL
    'Humberto_Cabrera'  => ['CRH_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Miguel_Monzalvo'   => ['MMA_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Jose_Montiel'      => ['MBJ_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Jeanet_Garcia'     => ['GCJ_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Israel_Moreno'     => ['MGI_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Luis_Vargas'       => ['VGL_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Daniel_Luna'       => ['LCD_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Mario_Lazcano'     => ['LAM_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Jorge_Leal'        => ['LRJ_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Ivan_Martinez'     => ['MAI_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Jairo_Jimenez'     => ['JRJ_CC26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Miguel_Odon'       => ['OM_CC26',  ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    // MANTENIMIENTO
    'Bonifacio_Alpizar' => ['ALB_ME26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Diana_Vazquez'     => ['VGD_ME26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Emilio_Corona'     => ['CME_ME26', ['centro_control','mesa_control','maniobristas','relevos','encierro','capturista']],
    'Gabriel_Garcia'    => ['GGV_ME26', ['mantenimiento','encierro','carga_combustible']],
    'Jorge_Nava'        => ['NVJ_ME26', ['mantenimiento','encierro','carga_combustible']],
    'Cesar_Badillo'     => ['BMC_ME26', ['mantenimiento','encierro','carga_combustible']],
    'Ramon_Bautista'    => ['BRR_ME26', ['mantenimiento','encierro','carga_combustible']],
    'Edgar_Gomez'       => ['GGE_ME26', ['mantenimiento','encierro','carga_combustible']],
    'Adrian_Isidro'     => ['ILA_ME26', ['mantenimiento','encierro','carga_combustible']],
    'Raquel_Aguilar'    => ['ARR_ME26', ['mantenimiento','encierro','carga_combustible']],
    'Karen_Rodriguez'   => ['RBK_ME26', ['mantenimiento','encierro','carga_combustible']],
    // MESA DE CONTROL
    'Angelica_Gonzalez' => ['GSA_MC26', ['centro_control','mesa_control','relevos']],
    // ENCIERRO
    'Jose_Angeles'      => ['AMJ_EN26', ['encierro']],
    // PASTELES
    'Ricardo_Macias'    => ['MVR_PL26', ['centro_control','mesa_control','programacion_pasteles']],
    'Victor_Alonso'     => ['AGV_PL26', ['centro_control','mesa_control','programacion_pasteles']],
];

$ok = 0;
$noEncontrado = 0;

foreach ($usuarios as $usuario => [$contrasena, $modulos]) {
    // Buscar el usuario en la BD
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = :usuario");
    $stmt->execute([':usuario' => $usuario]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo "❌ $usuario => NO ENCONTRADO en la base de datos\n";
        $noEncontrado++;
        continue;
    }

    $userId = $user['id'];

    // Actualizar contraseña y activar usuario
    $hash = password_hash($contrasena, PASSWORD_BCRYPT, ['cost' => 12]);
    $upd = $pdo->prepare("UPDATE usuarios SET contrasena = :hash, activo = true WHERE id = :id");
    $upd->execute([':hash' => $hash, ':id' => $userId]);

    // Borrar módulos actuales y reinsertar los correctos
    $pdo->prepare("DELETE FROM usuario_modulos WHERE usuario_id = :uid")->execute([':uid' => $userId]);
    foreach ($modulos as $modulo) {
        $ins = $pdo->prepare("INSERT INTO usuario_modulos (usuario_id, modulo_codigo) VALUES (:uid, :mod)");
        $ins->execute([':uid' => $userId, ':mod' => $modulo]);
    }

    echo "✅ $usuario => contraseña OK | módulos: " . implode(', ', $modulos) . "\n";
    $ok++;
}

echo "\n========================================\n";
echo "Actualizados: $ok | No encontrados: $noEncontrado\n";
echo "========================================\n";
echo "\n⚠️  IMPORTANTE: Borra este archivo ahora: rm fix_passwords.php\n";
echo "⚠️  IMPORTANTE: Reconstruye el frontend:  cd ../frontend && npm run build\n";
