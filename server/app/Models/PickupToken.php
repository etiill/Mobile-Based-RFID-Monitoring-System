<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PickupToken extends Model
{
    use HasFactory;

    protected $fillable = [
        'token',
        'teacher_id',
        'expires_at',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function teacher()
    {
        return $this->belongsTo(Admin::class, 'teacher_id');
    }
}
