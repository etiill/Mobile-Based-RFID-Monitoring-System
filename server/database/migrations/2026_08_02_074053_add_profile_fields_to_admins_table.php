<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            $table->string('phone')->nullable();
            $table->string('birth_date')->nullable();
            $table->string('faculty_classification')->nullable();
            $table->string('location')->nullable();
            $table->string('title')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('admins', function (Blueprint $table) {
            $table->dropColumn(['phone', 'birth_date', 'faculty_classification', 'location', 'title']);
        });
    }
};
