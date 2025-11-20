<?php

it('registers a new user via OTP verification', function () {
    $email = 'newuser'.uniqid().'@example.test';
    $payload = [
        'email' => $email,
        'name' => 'Test User',
        'password' => 'SecretPass123!',
        'password_confirmation' => 'SecretPass123!',
    ];
    $requestOtp = $this->postJson('/api/auth/register/request-otp', $payload);
    $requestOtp->assertStatus(200)->assertJsonStructure(['ok','cooldown_seconds','test_code']);
    $code = $requestOtp->json('test_code');
    expect($code)->toHaveLength(6);

    $verify = $this->postJson('/api/auth/register/verify-otp', [
        'email' => $email,
        'code' => $code,
        'remember' => true,
    ]);
    $verify->assertStatus(200)->assertJsonStructure(['ok','user','token','remember_expires_at']);
    $user = \App\Models\User::where('email',$email)->first();
    expect($user)->not()->toBeNull();
    $user->loadMissing('role');
    expect($user->role?->name)->toBe('public');
})->group('auth','registration');
