<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('author_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('category', 30)->index();
            $table->string('title', 200);
            $table->text('body');
            $table->string('language', 5)->default('fr');
            $table->string('status', 20)->default('open')->index();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamps();
            $table->index(['category', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
