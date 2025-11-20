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
            // Title optional but recommended; enforce min length if present
            'title' => ['nullable','string','max:160','min:3'],
            // Either message or description must be provided, each at least 10 chars if present
            'message' => ['required_without:description','string','max:4000','min:10'],
            'description' => ['required_without:message','string','max:4000','min:10'],
            // Additional context fields
            'lake_id' => ['nullable','integer','exists:lakes,id'],
            'type' => ['nullable','string','in:Missing information,Incorrect data,Add photo,Other'],
            'contact' => ['nullable','string','max:160'],
            // Images (multipart form uploads)
            'images' => ['sometimes','array','max:6'],
            // Allow images and PDFs up to 25MB each
            'images.*' => ['file','mimes:jpg,jpeg,png,pdf','max:25600'],
                'category' => ['nullable','string','in:bug,suggestion,data,ui,other,org_petition'],
            'guest_name' => ['nullable','string','max:120'],
            'guest_email' => ['nullable','email','max:160'],
            // Honeypot: must remain empty or absent
            'website' => ['nullable','size:0'],
        ];
    }
}
