import json
import psycopg2
import bcrypt

dsn = "postgresql://neondb_owner:npg_gcJSlU0a3feO@ep-small-cloud-ay6nitqn-pooler.c-5.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

try:
    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    # Get roles
    cur.execute("SELECT id, nombre FROM roles")
    roles = {row[1].upper().strip(): row[0] for row in cur.fetchall()}

    with open('/tmp/usuarios_clean.json') as f:
        usuarios = json.load(f)

    inserted = 0
    updated = 0

    for u in usuarios:
        rol_excel = str(u.get('Rol Asignado')).upper().strip()
        rol_id = roles.get(rol_excel, roles.get('LECTURA', 2))

        nombre = str(u.get('Nombre Completo')).strip()
        usuario = str(u.get('Usuario')).strip()
        contrasena_raw = str(u.get('Contraseña')).strip()
        
        # PHP uses $2y$ but Python bcrypt uses $2b$.
        hashed = bcrypt.hashpw(contrasena_raw.encode('utf-8'), bcrypt.gensalt())
        hashed_str = hashed.decode('utf-8').replace("$2b$", "$2y$")

        estatus_raw = str(u.get('Estatus')).upper().strip()
        activo = True if estatus_raw == 'ACTIVO' else False

        cur.execute("SELECT id FROM usuarios WHERE usuario = %s", (usuario,))
        row = cur.fetchone()

        if row:
            cur.execute("""
                UPDATE usuarios 
                SET nombre_completo = %s, contrasena = %s, rol_id = %s, activo = %s 
                WHERE id = %s
            """, (nombre, hashed_str, rol_id, activo, row[0]))
            updated += 1
        else:
            cur.execute("""
                INSERT INTO usuarios (nombre_completo, usuario, contrasena, rol_id, activo, fecha_creacion, fecha_actualizacion) 
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
            """, (nombre, usuario, hashed_str, rol_id, activo))
            inserted += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"Importación exitosa. Insertados: {inserted}, Actualizados: {updated}")

except Exception as e:
    print(f"Error: {e}")
