<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class CreateAdminUser extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:admin';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create the initial Admin user';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $role = Role::where('codigo', 'ADMINISTRADOR')->first();
        if (!$role) {
            $this->error('Admin role not found. Make sure the roles are seeded in the database.');
            return;
        }

        $user = User::where('usuario', 'Admin')->first();
        if ($user) {
            $this->info('Admin user already exists.');
            return;
        }

        User::create([
            'nombre_completo' => 'Administrador del Sistema',
            'usuario' => 'Admin',
            'contrasena' => Hash::make('password'),
            'activo' => true,
            'rol_id' => $role->id,
        ]);

        $this->info('Admin user created successfully! Username: Admin, Password: password');
    }
}
