<?php
$dsn = "pgsql:host=ep-small-cloud-ay6nitqn-pooler.c-5.us-east-2.aws.neon.tech;port=5432;dbname=neondb;sslmode=require";
$user = "neondb_owner";
$password = "npg_gcJSlU0a3feO";
try {
    $pdo = new PDO($dsn, $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    $jsonStr = file_get_contents('/tmp/usuarios_clean.json');
    $usuarios = json_decode($jsonStr, true);
    
    $rolesCache = [];
    $stmtRoles = $pdo->query("SELECT id, nombre FROM roles");
    while ($row = $stmtRoles->fetch(PDO::FETCH_ASSOC)) {
        $rolesCache[strtoupper(trim($row['nombre']))] = $row['id'];
    }

    $inserted = 0;
    $updated = 0;

    foreach ($usuarios as $u) {
        $rolExcel = strtoupper(trim($u['Rol Asignado']));
        if (!isset($rolesCache[$rolExcel])) {
            $rolId = $rolesCache['LECTURA'] ?? 2;
        } else {
            $rolId = $rolesCache[$rolExcel];
        }

        $nombre = trim($u['Nombre Completo']);
        $usuario = trim($u['Usuario']);
        $contrasenaRaw = trim($u['Contraseña']);
        $estatus = strtoupper(trim($u['Estatus'])) === 'ACTIVO' ? 'true' : 'false';
        
        $hashedPassword = password_hash($contrasenaRaw, PASSWORD_BCRYPT);

        $stmtCheck = $pdo->prepare("SELECT id FROM usuarios WHERE usuario = ?");
        $stmtCheck->execute([$usuario]);
        if ($row = $stmtCheck->fetch(PDO::FETCH_ASSOC)) {
            $stmtUpd = $pdo->prepare("UPDATE usuarios SET nombre_completo = ?, contrasena = ?, rol_id = ?, activo = ? WHERE id = ?");
            $stmtUpd->execute([$nombre, $hashedPassword, $rolId, $estatus, $row['id']]);
            $updated++;
        } else {
            $stmtIns = $pdo->prepare("INSERT INTO usuarios (nombre_completo, usuario, contrasena, rol_id, activo, fecha_creacion, fecha_actualizacion) VALUES (?, ?, ?, ?, ?, NOW(), NOW())");
            $stmtIns->execute([$nombre, $usuario, $hashedPassword, $rolId, $estatus]);
            $inserted++;
        }
    }

    echo json_encode([
        'message' => 'Importación exitosa',
        'insertados' => $inserted,
        'actualizados' => $updated
    ]);
} catch (\Throwable $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
