<?php

use Illuminate\Support\Facades\Route;

// Named login route for guest redirects (Laravel default)
// Points to your SPA shell so the frontend router can handle /login
Route::view('/login', 'app')->name('login');

Route::get('/{any}', function () {
    return view('app'); // your main blade file that mounts React
})->where('any', '.*');
