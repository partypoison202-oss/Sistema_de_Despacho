<?php

$dbName = "sistema_despacho_prod";
$host = "ep-small-cloud-ay6nitqn-pooler.c-5.us-east-2.aws.neon.tech";
$user = "neondb_owner";
$password = "npg_gcJSlU0a3feO";

$dsn = "pgsql:host=$host;port=5432;dbname=$dbName;sslmode=require";

try {
    echo "Conectando a Neon (Base de datos: $dbName)...\n";
    $pdo = new PDO($dsn, $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "¡Conexión exitosa como Owner!\n\n";

    $tables = [
        'informacion_operativa',
        'informacion_operativa_manana',
        'informacion_operativa_sabado',
        'informacion_operativa_domingo',
        'informacion_operativa_lunes',
        'informacion_operativa_festivo'
    ];

    foreach ($tables as $table) {
        echo "Actualizando tabla: $table\n";
        
        try {
            $pdo->exec("ALTER TABLE \"$table\" ADD COLUMN patio_norte BOOLEAN NOT NULL DEFAULT false");
            echo "  [EXITO] Columna 'patio_norte' agregada.\n";
        } catch(PDOException $e) {
            if (strpos($e->getMessage(), 'already exists') !== false) {
                echo "  [INFO] La columna 'patio_norte' ya existe.\n";
            } else {
                echo "  [ERROR] patio_norte: " . $e->getMessage() . "\n";
            }
        }
        
        try {
            $pdo->exec("ALTER TABLE \"$table\" ADD COLUMN transporte_patio_norte BOOLEAN NOT NULL DEFAULT false");
            echo "  [EXITO] Columna 'transporte_patio_norte' agregada.\n";
        } catch(PDOException $e) {
            if (strpos($e->getMessage(), 'already exists') !== false) {
                echo "  [INFO] La columna 'transporte_patio_norte' ya existe.\n";
            } else {
                echo "  [ERROR] transporte_patio_norte: " . $e->getMessage() . "\n";
            }
        }
        echo "\n";
    }
    
    echo "¡MIGRACIÓN COMPLETADA EXITOSAMENTE EN NEON!\n";
} catch(PDOException $e) {
    echo "Error conectando a $dbName: " . $e->getMessage() . "\n\n";
    
    echo "Intentando con la base de datos por defecto 'neondb'...\n";
    try {
        $dsn2 = "pgsql:host=$host;port=5432;dbname=neondb;sslmode=require";
        $pdo2 = new PDO($dsn2, $user, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        
        // Si conecta a neondb, quizás el usuario quiera migrar ahí
        echo "¡Conectado a neondb! (Asegúrate de que esta sea la base de datos correcta)\n";
        
        foreach ($tables as $table) {
            echo "Actualizando tabla: $table\n";
            try {
                $pdo2->exec("ALTER TABLE \"$table\" ADD COLUMN patio_norte BOOLEAN NOT NULL DEFAULT false");
                echo "  [EXITO] Columna 'patio_norte' agregada.\n";
            } catch(PDOException $ex) {}
            try {
                $pdo2->exec("ALTER TABLE \"$table\" ADD COLUMN transporte_patio_norte BOOLEAN NOT NULL DEFAULT false");
                echo "  [EXITO] Columna 'transporte_patio_norte' agregada.\n";
            } catch(PDOException $ex) {}
        }
        echo "\n¡MIGRACIÓN COMPLETADA EN neondb!\n";
        
    } catch (PDOException $ex2) {
        echo "Error fatal: No se pudo conectar a ninguna base de datos.\n";
    }
}
?>
