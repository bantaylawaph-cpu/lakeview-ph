<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Adjust if you gate this via policies/middleware elsewhere
        return true;
    }

    /**
     * Normalize Philippine mobile numbers to E.164 before validation.
     * Accepted user inputs:
     *   - 09171234567   -> +639171234567
     *   - 9171234567    -> +639171234567
     *   - +639171234567 -> +639171234567
     */
    protected function prepareForValidation(): void
    {
        $raw = (string) $this->input('phone', '');

        if ($raw !== '') {
            $digits = preg_replace('/\D+/', '', $raw) ?? '';
            $e164 = $raw;

            if (strlen($digits) === 11 && str_starts_with($digits, '09')) {
                $e164 = '+63' . substr($digits, 1);
            } elseif (strlen($digits) === 10 && str_starts_with($digits, '9')) {
                $e164 = '+63' . $digits;
            } elseif (strlen($digits) === 12 && str_starts_with($digits, '639')) {
                $e164 = '+' . $digits;
            }

            $this->merge(['phone' => $e164]);
        }
    }

    public function rules(): array
    {
        return [
            'name'          => ['required', 'string', 'max:255'],
            // Common set you’ve referenced: ngo | academic | government | private | other
            'type'          => ['required', 'string', Rule::in(['ngo', 'academic', 'government', 'private', 'other'])],
            'contact_email' => ['required', 'email', 'max:255'],
            'phone'         => ['nullable', 'string', 'max:20', 'regex:/^\+639\d{9}$/'],
            'address'       => ['nullable', 'string'],
            'domain'        => ['nullable', 'string', 'max:255', 'unique:tenants,domain'],
            'metadata'      => ['nullable', 'array'],
            'active'        => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'type.in'       => 'Type must be one of: ngo, academic, government, private, or other.',
            'phone.regex'   => 'Use a valid PH mobile number (e.g., 09171234567 or +639171234567).',
            'contact_email.email' => 'Please enter a valid email address.',
        ];
    }
}
