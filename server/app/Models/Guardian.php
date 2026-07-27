<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Guardian extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'student_id',
        'name',
        'relation',
        'phone',
    ];

    /**
     * Get the student that the guardian belongs to.
     */
    public function student()
    {
        return $this->belongsTo(Student::class);
    }
}
