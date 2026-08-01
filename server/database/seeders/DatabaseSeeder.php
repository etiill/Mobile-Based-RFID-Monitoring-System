<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Role;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $guardianRole = Role::firstOrCreate(['role_name' => 'Guardian']);
        $teacherRole = Role::firstOrCreate(['role_name' => 'Teacher']);
        $adminRole = Role::firstOrCreate(['role_name' => 'Admin']);

        $adminUser = Admin::firstOrCreate(
            ['email' => 'admin@fcu.edu'],
            [
                'name' => 'Administrator',
                'password' => Hash::make('password'),
                'role' => 'admin',
            ]
        );
        $adminUser->role_id = $adminRole->id;
        $adminUser->save();

        $teacherUser = Admin::firstOrCreate(
            ['email' => 'teacher@fcu.edu'],
            [
                'name' => 'Jane Smith',
                'password' => Hash::make('password'),
                'role' => 'teacher',
            ]
        );
        $teacherUser->role_id = $teacherRole->id;
        $teacherUser->save();

        $this->call(StudentSeeder::class);
    }
}
