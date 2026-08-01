<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // The role_id column is handled by the later admin update migration.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op for compatibility.
    }
};
