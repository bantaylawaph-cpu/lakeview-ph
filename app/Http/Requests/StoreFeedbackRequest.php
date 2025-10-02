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
            'title' => ['required','string','max:160'],
            'message' => ['required','string','max:2000'],
            'category' => ['nullable','string','max:60'],
            'metadata' => ['nullable','array'],
        ];
    }
}
