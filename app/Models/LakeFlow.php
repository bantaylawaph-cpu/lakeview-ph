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

    protected static function booted()
    {
        // When a flow is created, ensure lake.flows_status becomes 'present'
        static::created(function (LakeFlow $flow) {
            if ($flow->lake_id) {
                Lake::where('id', $flow->lake_id)->update(['flows_status' => 'present']);
            }
        });

        // Handle lake reassignment on update
        static::updated(function (LakeFlow $flow) {
            if ($flow->wasChanged('lake_id')) {
                $oldLakeId = $flow->getOriginal('lake_id');
                $newLakeId = $flow->lake_id;
                if ($newLakeId) {
                    Lake::where('id', $newLakeId)->update(['flows_status' => 'present']);
                }
                if ($oldLakeId) {
                    $remaining = LakeFlow::where('lake_id', $oldLakeId)->count();
                    if ($remaining === 0) {
                        // Respect explicit 'none' manual setting
                        Lake::where('id', $oldLakeId)->where('flows_status', '!=', 'none')->update(['flows_status' => 'unknown']);
                    }
                }
            }
        });

        // When a flow is deleted, if no more flows remain for that lake, set to unknown (unless explicitly 'none')
        static::deleted(function (LakeFlow $flow) {
            if ($flow->lake_id) {
                $remaining = LakeFlow::where('lake_id', $flow->lake_id)->count();
                if ($remaining === 0) {
                    Lake::where('id', $flow->lake_id)->where('flows_status', '!=', 'none')->update(['flows_status' => 'unknown']);
                }
            }
        });
    }
}
