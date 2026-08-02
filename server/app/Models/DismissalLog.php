<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class DismissalLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'student_id',
        'guardian_id',
        'teacher_id',
        'station_token',
        'status',
        'verified_at',
    ];

    protected $casts = [
        'verified_at' => 'datetime',
    ];

    public function student()
    {
        return $this->belongsTo(Student::class);
    }

    public function guardian()
    {
        return $this->belongsTo(Guardian::class);
    }

    public function teacher()
    {
        return $this->belongsTo(Admin::class, 'teacher_id');
    }
}
