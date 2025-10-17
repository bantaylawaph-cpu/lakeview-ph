<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool)$this->user();
    }

    public function rules(): array
    {
        return [
            'title' => ['required_without:description','string','max:160'],
            'message' => ['required_without:description','string','max:4000'],
            'description' => ['nullable','string','max:4000'],
            'lake_id' => ['nullable','integer','exists:lakes,id'],
            'type' => ['nullable','string','in:Missing information,Incorrect data,Add photo,Other'],
            'images' => ['sometimes','array','max:6'],
            'images.*' => ['file','mimes:jpg,jpeg,png,pdf','max:25600'],
            'category' => ['nullable','string','max:60'],
            'metadata' => ['nullable','array'],
        ];
    }
}
