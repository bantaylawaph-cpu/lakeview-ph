<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PopulationRaster extends Model
{
    use HasFactory, \App\Support\Audit\Auditable;

    protected $fillable = [
        'year','filename','disk','path','srid','pixel_size_x','pixel_size_y','uploaded_by','status','notes','link','error_message',
        'dataset_id','file_size_bytes','file_sha256','ingestion_started_at','ingestion_finished_at','ingestion_step'
    ];

    protected $casts = [
        'year' => 'integer',
        'srid' => 'integer',
        'pixel_size_x' => 'float',
        'pixel_size_y' => 'float',
        'uploaded_by' => 'integer',
        'dataset_id' => 'integer',
        'file_size_bytes' => 'integer',
        'ingestion_started_at' => 'datetime',
        'ingestion_finished_at' => 'datetime',
        'ingestion_step' => 'string',
        'link' => 'string',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function uploader()
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
