<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Models\Guardian;
use App\Models\Section;
use App\Models\Attendance;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StudentSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure primary section exists
        $teacher = \App\Models\Admin::where('role', 'teacher')->first();
        $section = Section::firstOrCreate(
            ['section_name' => 'Section A', 'year_level' => 'Kindergarten'],
            ['teacher_id' => $teacher?->id]
        );

        $today = date('Y-m-d');

        // 2. Student definitions with corresponding guardians and today's attendance
        $studentsData = [
            [
                'name' => 'Reyes, Ella',
                'grade' => 'Kindergarten',
                'rfid' => 'E2806A960000501AB7463924',
                'guardians' => [
                    ['name' => 'Reyes, Maria', 'relation' => 'Mother', 'phone' => '0917 123 4567', 'email' => 'maria.reyes@fcu.edu']
                ],
                'attendance' => [
                    'time_in' => '07:45:00',
                    'time_out' => null,
                    'status' => 'Present',
                    'verified_by' => 'RFID Main Gate'
                ]
            ],
            [
                'name' => 'Cruz, Nathan',
                'grade' => 'Kindergarten',
                'rfid' => 'E2806A960000501AB7463925',
                'guardians' => [
                    ['name' => 'Cruz, Daniel', 'relation' => 'Father', 'phone' => '0918 234 5678', 'email' => 'daniel.cruz@fcu.edu']
                ],
                'attendance' => [
                    'time_in' => '07:50:00',
                    'time_out' => null,
                    'status' => 'Present',
                    'verified_by' => 'RFID Main Gate'
                ]
            ],
            [
                'name' => 'Garcia, Liam',
                'grade' => 'Kindergarten',
                'rfid' => 'E2806A960000501AB7463926',
                'guardians' => [
                    ['name' => 'Garcia, Roberto', 'relation' => 'Father', 'phone' => '0920 456 7890', 'email' => 'roberto.garcia@fcu.edu']
                ],
                'attendance' => [
                    'time_in' => '07:55:00',
                    'time_out' => null,
                    'status' => 'Present',
                    'verified_by' => 'RFID Main Gate'
                ]
            ],
            [
                'name' => 'Garcia, Sophia',
                'grade' => 'Kindergarten',
                'rfid' => 'E2806A960000501AB7463927',
                'guardians' => [
                    ['name' => 'Santos, Ana', 'relation' => 'Mother', 'phone' => '0917 345 6789', 'email' => 'ana.santos@fcu.edu']
                ],
                'attendance' => [
                    'time_in' => '08:05:00',
                    'time_out' => null,
                    'status' => 'Late',
                    'verified_by' => 'RFID Main Gate'
                ]
            ],
            [
                'name' => 'Mendoza, Kyla',
                'grade' => 'Kindergarten',
                'rfid' => 'E2806A960000501AB7463928',
                'guardians' => [
                    ['name' => 'Mendoza, Carla', 'relation' => 'Mother', 'phone' => '0918 567 8901', 'email' => 'carla.mendoza@fcu.edu']
                ],
                'attendance' => [
                    'time_in' => '07:58:00',
                    'time_out' => null,
                    'status' => 'Present',
                    'verified_by' => 'RFID Main Gate'
                ]
            ],
            [
                'name' => 'Villanueva, Noah',
                'grade' => 'Kindergarten',
                'rfid' => 'E2806A960000501AB7463929',
                'guardians' => [
                    ['name' => 'Villanueva, Elena', 'relation' => 'Mother', 'phone' => '0919 678 9012', 'email' => 'elena.v@fcu.edu']
                ],
                'attendance' => [
                    'time_in' => '07:40:00',
                    'time_out' => '11:30:00',
                    'status' => 'Checked Out',
                    'verified_by' => 'Guardian QR'
                ]
            ],
            [
                'name' => 'Lopez, Ava',
                'grade' => 'Kindergarten',
                'rfid' => 'E2806A960000501AB7463930',
                'guardians' => [
                    ['name' => 'Lopez, Marco', 'relation' => 'Father', 'phone' => '0921 789 0123', 'email' => 'marco.lopez@fcu.edu']
                ],
                'attendance' => null // Absent
            ],
            [
                'name' => 'Chen, Liam',
                'grade' => 'Kindergarten',
                'rfid' => '001235',
                'guardians' => [
                    ['name' => 'Wei Chen', 'relation' => 'Mother', 'phone' => '0917 555 0201', 'email' => 'wei@fcu.edu']
                ],
                'attendance' => null // Absent
            ],
            [
                'name' => 'Johnson, Emma',
                'grade' => 'Kindergarten',
                'rfid' => '001236',
                'guardians' => [
                    ['name' => 'Sarah Johnson', 'relation' => 'Mother', 'phone' => '0917 555 0101', 'email' => 'sarah@fcu.edu'],
                    ['name' => 'Michael Johnson', 'relation' => 'Father', 'phone' => '0917 555 0102', 'email' => 'michael@fcu.edu']
                ],
                'attendance' => [
                    'time_in' => '07:48:00',
                    'time_out' => null,
                    'status' => 'Present',
                    'verified_by' => 'RFID Main Gate'
                ]
            ]
        ];

        foreach ($studentsData as $data) {
            $student = Student::updateOrCreate(
                ['rfid' => $data['rfid']],
                [
                    'name' => $data['name'],
                    'grade' => $data['grade'],
                    'section_id' => $section->id,
                ]
            );

            // Create or update guardians
            foreach ($data['guardians'] as $g) {
                Guardian::updateOrCreate(
                    ['email' => $g['email']],
                    [
                        'student_id' => $student->id,
                        'name' => $g['name'],
                        'relation' => $g['relation'],
                        'phone' => $g['phone'],
                        'password' => Hash::make('password'),
                    ]
                );
            }

            // Create attendance record if present
            if ($data['attendance']) {
                Attendance::updateOrCreate(
                    [
                        'student_id' => $student->id,
                        'date' => $today,
                    ],
                    [
                        'time_in' => $data['attendance']['time_in'],
                        'time_out' => $data['attendance']['time_out'],
                        'status' => $data['attendance']['status'],
                        'verified_by' => $data['attendance']['verified_by'],
                    ]
                );
            }
        }
    }
}
