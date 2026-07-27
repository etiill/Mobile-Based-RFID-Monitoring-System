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
        // 1. Seed Emma Johnson
        $emma = Student::create([
            'name' => 'Emma Johnson',
            'grade' => 'K-1',
            'rfid' => 'RFID-001234',
        ]);

        $emma->guardians()->createMany([
            [
                'name' => 'Sarah Johnson',
                'relation' => 'Mother',
                'phone' => '555-0101',
            ],
            [
                'name' => 'Michael Johnson',
                'relation' => 'Father',
                'phone' => '555-0102',
            ],
        ]);

        // 2. Seed Liam Chen
        $liam = Student::create([
            'name' => 'Liam Chen',
            'grade' => 'K-2',
            'rfid' => 'RFID-001235',
        ]);

        $liam->guardians()->create([
            'name' => 'Wei Chen',
            'relation' => 'Mother',
            'phone' => '555-0201',
        ]);
    }
}
