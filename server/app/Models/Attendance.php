<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'student_id',
        'date',
        'time_in',
        'time_out',
        'status',
        'verified_by',
    ];

    /**
     * Get the student associated with the attendance record.
     */
    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
