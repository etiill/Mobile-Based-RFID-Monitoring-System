<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Section extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'year_level',
        'section_name',
        'teacher_id',
    ];

    /**
     * Get the teacher assigned to the section.
     */
    public function teacher()
    {
        return $this->belongsTo(Admin::class, 'teacher_id');
    }

    /**
     * Get the students in the section.
     */
    public function students()
    {
        return $this->hasMany(Student::class);
    }
}
