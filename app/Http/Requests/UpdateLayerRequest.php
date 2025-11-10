<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLayerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null; // role gate happens in controller
    }

    public function rules(): array
    {
        return [
            'name'        => 'sometimes|string|max:255',
            'srid'        => 'sometimes|nullable|integer|min:0',
            'visibility'  => 'sometimes|string|in:public,admin,organization,organization_admin',
            'is_downloadable' => 'sometimes|boolean',
            'notes'       => 'sometimes|nullable|string',
            'source_type' => 'sometimes|string|in:geojson,kml,shp,gpkg',

            // Optional geometry replacement
            'geom_geojson' => 'sometimes|string',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('is_downloadable')) {
            $this->merge([
                'is_downloadable' => filter_var($this->input('is_downloadable'), FILTER_VALIDATE_BOOLEAN),
            ]);
        }
    }
}
