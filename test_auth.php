<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// Get the authenticated user from the last token
$token = \Laravel\Sanctum\PersonalAccessToken::latest()->first();

if (!$token) {
    echo "No tokens found\n";
    exit;
}

echo "Latest Token Info:\n";
echo "==================\n";
echo "Token ID: {$token->id}\n";
echo "Tokenable Type: {$token->tokenable_type}\n";
echo "Tokenable ID: {$token->tokenable_id}\n";
echo "Abilities: " . json_encode($token->abilities) . "\n";
echo "Last used: {$token->last_used_at}\n\n";

// Get the user
$user = $token->tokenable;
if ($user) {
    $user->load('role');
    echo "User Info:\n";
    echo "==========\n";
    echo "ID: {$user->id}\n";
    echo "Name: {$user->name}\n";
    echo "Email: {$user->email}\n";
    echo "Role: {$user->role?->name}\n";
}
