<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class Admin extends Authenticatable
{
    use HasApiTokens, Notifiable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'admins';

    /**
     * The accessors to append to the model array form.
     *
     * @var list<string>
     */
    protected $appends = ['role_name'];

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'role_id',
        'phone',
        'birth_date',
        'faculty_classification',
        'location',
        'title',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    /**
     * Get the role linked to this admin.
     */
    public function systemRole()
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    /**
     * Get the readable role name for this admin.
     */
    public function getRoleNameAttribute(): ?string
    {
        return $this->systemRole?->role_name;
    }
}
