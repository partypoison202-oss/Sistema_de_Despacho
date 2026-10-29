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
        // Asegurar que el trigger de última conexión sea AFTER en lugar de BEFORE
        // para prevenir que 'selectFromWriteConnection' retorne vacío y cause
        // 'Undefined array key 0' en PostgresProcessor al crear tokens de Sanctum.
        DB::statement("DROP TRIGGER IF EXISTS trigger_sync_user_ultima_conexion ON public.personal_access_tokens;");

        // Verificar si la función existe antes de asociar el trigger
        $functionExists = DB::select("
            SELECT 1 FROM pg_proc 
            JOIN pg_namespace n ON n.oid = pg_proc.pronamespace 
            WHERE proname = 'trg_sync_user_ultima_conexion' AND n.nspname = 'public'
        ");

        if (!empty($functionExists)) {
            DB::statement("
                CREATE TRIGGER trigger_sync_user_ultima_conexion
                AFTER INSERT OR DELETE OR UPDATE OF last_used_at
                ON public.personal_access_tokens
                FOR EACH ROW
                EXECUTE FUNCTION trg_sync_user_ultima_conexion();
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No destructivo: mantener como AFTER o eliminar trigger
    }
};
