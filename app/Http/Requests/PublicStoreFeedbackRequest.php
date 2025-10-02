<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class PublicStoreFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Public endpoint, throttled separately
    }

    public function rules(): array
    {
        return [
            'title' => ['required','string','max:160'],
            'message' => ['required','string','max:2000'],
            'category' => ['nullable','string','in:bug,suggestion,data,ui,other'],
            'guest_name' => ['nullable','string','max:120'],
            'guest_email' => ['nullable','email','max:160'],
            // Honeypot: must remain empty or absent
            'website' => ['nullable','size:0'],
        ];
    }
}
