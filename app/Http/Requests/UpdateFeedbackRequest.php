<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Feedback;

class UpdateFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool)$this->user();
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes','required','string','in:'.implode(',', Feedback::ALL_STATUSES)],
            'admin_response' => ['nullable','string'],
        ];
    }
}
