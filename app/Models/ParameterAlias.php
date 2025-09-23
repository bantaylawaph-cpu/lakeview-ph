<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParameterAlias extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'parameter_id',
        'alias',
    ];

    public function parameter()
    {
        return $this->belongsTo(Parameter::class);
    }
}
