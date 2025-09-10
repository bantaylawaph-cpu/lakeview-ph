<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserTenant extends Model
{
    protected $table = 'user_tenants';
    protected $fillable = ['user_id','tenant_id','role_id','joined_at','is_active'];
}