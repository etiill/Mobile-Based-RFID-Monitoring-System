<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'grade',
        'rfid',
    ];

    /**
     * Get the guardians associated with the student.
     */
    public function guardians()
    {
        return $this->hasMany(Guardian::class);
    }
}
