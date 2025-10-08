<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LakeFlow extends Model
{
    use HasFactory, \App\Support\Audit\Auditable;

    protected $fillable = [
        'lake_id','flow_type','name','alt_name','source','is_primary','notes','coordinates','latitude','longitude','created_by'
    ];

    protected $casts = [
        'is_primary' => 'boolean',
    ];

    public function lake()
    {
        return $this->belongsTo(Lake::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
