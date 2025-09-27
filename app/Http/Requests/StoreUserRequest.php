<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Role;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name' => ['nullable','string','max:255'],
            'email' => ['required','email','max:255','unique:users,email'],
            'password' => ['required','string','min:8','confirmed'],
            'role' => ['required', Rule::in([Role::PUBLIC, Role::CONTRIBUTOR, Role::ORG_ADMIN, Role::SUPERADMIN])],
            'tenant_id' => ['nullable','integer','exists:tenants,id'],
        ];
    }

    public function withValidator($v)
    {
        $v->after(function($v){
            $role = $this->input('role');
            $tenantId = $this->input('tenant_id');
            if (in_array($role, [Role::CONTRIBUTOR, Role::ORG_ADMIN]) && !$tenantId) {
                $v->errors()->add('tenant_id', 'tenant_id is required for tenant-scoped role.');
            }
            if (in_array($role, [Role::SUPERADMIN, Role::PUBLIC]) && $tenantId) {
                $v->errors()->add('tenant_id', 'tenant_id must be null for system role.');
            }
        });
    }
}
