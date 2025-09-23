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
            'type'        => 'sometimes|string|max:64',
            'category'    => 'sometimes|nullable|string|max:64',
            'srid'        => 'sometimes|nullable|integer|min:0',
            'visibility'  => 'sometimes|string|in:admin,public,organization_admin',
            'is_active'   => 'sometimes|boolean',
            'status'      => 'sometimes|string|in:draft,ready,archived',
            'version'     => 'sometimes|integer|min:1',
            'notes'       => 'sometimes|nullable|string',
            'source_type' => 'sometimes|string|in:geojson,json,shp,kml,gpkg,wkt',

            // Optional geometry replacement
            'geom_geojson' => 'sometimes|string',
        ];
    }
}
