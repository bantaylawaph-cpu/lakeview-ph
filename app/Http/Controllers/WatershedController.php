<?php

namespace App\Http\Controllers;

use App\Models\Watershed;

class WatershedController extends Controller
{
    public function index()
    {
        return Watershed::select('id','name')->orderBy('name')->get();
    }
}
