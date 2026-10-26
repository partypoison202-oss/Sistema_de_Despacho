<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Crear función y trigger para que cualquier borrado o actualización de token
        // (incluso desde el servidor de producción con código antiguo) preserve siempre
        // la hora real de última conexión en la tabla usuarios.
        DB::unprepared("
            CREATE OR REPLACE FUNCTION trg_sync_user_ultima_conexion()
            RETURNS TRIGGER AS $$
            BEGIN
                IF (TG_OP = 'DELETE') THEN
                    IF OLD.tokenable_type = 'App\\Models\\User' AND OLD.tokenable_id IS NOT NULL THEN
                        UPDATE usuarios 
                        SET ultima_conexion = GREATEST(COALESCE(ultima_conexion, '2000-01-01'::timestamp), COALESCE(OLD.last_used_at, NOW()))
                        WHERE id = OLD.tokenable_id;
                    END IF;
                    RETURN OLD;
                ELSIF (TG_OP = 'UPDATE' OR TG_OP = 'INSERT') THEN
                    IF NEW.tokenable_type = 'App\\Models\\User' AND NEW.tokenable_id IS NOT NULL AND NEW.last_used_at IS NOT NULL THEN
                        UPDATE usuarios 
                        SET ultima_conexion = GREATEST(COALESCE(ultima_conexion, '2000-01-01'::timestamp), NEW.last_used_at)
                        WHERE id = NEW.tokenable_id;
                    END IF;
                    RETURN NEW;
                END IF;
                RETURN NULL;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_sync_user_ultima_conexion ON personal_access_tokens;

            CREATE TRIGGER trigger_sync_user_ultima_conexion
            AFTER DELETE OR INSERT OR UPDATE OF last_used_at ON personal_access_tokens
            FOR EACH ROW
            EXECUTE FUNCTION trg_sync_user_ultima_conexion();
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::unprepared("
            DROP TRIGGER IF EXISTS trigger_sync_user_ultima_conexion ON personal_access_tokens;
            DROP FUNCTION IF EXISTS trg_sync_user_ultima_conexion();
        ");
    }
};
