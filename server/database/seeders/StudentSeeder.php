<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\Guardian;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $section = \App\Models\Section::where('section_name', 'Alpha')->first();

        $emma = Student::firstOrCreate(
            ['rfid' => 'RFID-001234'],
            [
                'name' => 'Emma Johnson',
                'grade' => 'K-1',
                'section_id' => $section?->id,
            ]
        );

        $emma->guardians()->firstOrCreate(
            ['email' => 'sarah@fcu.edu'],
            [
                'name' => 'Sarah Johnson',
                'relation' => 'Mother',
                'phone' => '555-0101',
                'password' => bcrypt('password'),
            ]
        );

        $emma->guardians()->firstOrCreate(
            ['email' => 'michael@fcu.edu'],
            [
                'name' => 'Michael Johnson',
                'relation' => 'Father',
                'phone' => '555-0102',
                'password' => bcrypt('password'),
            ]
        );

        $liam = Student::firstOrCreate(
            ['rfid' => 'RFID-001235'],
            [
                'name' => 'Liam Chen',
                'grade' => 'K-2',
            ]
        );

        $liam->guardians()->firstOrCreate(
            ['email' => 'wei@fcu.edu'],
            [
                'name' => 'Wei Chen',
                'relation' => 'Mother',
                'phone' => '555-0201',
                'password' => bcrypt('password'),
            ]
        );
    }
}
