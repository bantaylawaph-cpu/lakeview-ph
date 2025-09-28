<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use App\Models\Role;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $userId = optional($this->route('user'))->id ?? $this->user_id ?? null;
        return [
            'name' => ['nullable','string','max:255'],
            'email' => ['required','email','max:255', Rule::unique('users','email')->ignore($userId)],
            'password' => ['nullable','string','min:8','confirmed'],
            'role' => ['required', Rule::in([Role::PUBLIC, Role::CONTRIBUTOR, Role::ORG_ADMIN, Role::SUPERADMIN])],
            'tenant_id' => ['nullable','integer','exists:tenants,id'],
            'is_active' => ['nullable','boolean'],
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
