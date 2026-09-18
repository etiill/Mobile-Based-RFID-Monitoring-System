<?php

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Student;

$students = Student::all();
echo "Found " . $students->count() . " students:\n";

foreach ($students as $student) {
    echo "ID {$student->id}: {$student->name} - Current RFID: {$student->rfid}\n";
    if (str_starts_with($student->rfid, 'RFID-')) {
        $clean = substr($student->rfid, 5); // strip 'RFID-'
        $student->rfid = $clean;
        $student->save();
        echo "  --> Cleaned to: {$clean}\n";
    }
}

echo "Done!\n";
