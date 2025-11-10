<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLayerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null; // role gate happens in controller
    }

    public function rules(): array
    {
        return [
            'body_type'      => 'required|string|in:lake,watershed',
            'body_id'        => 'required|integer|min:1',
            'name'           => 'required|string|max:255',
            'srid'           => 'nullable|integer|min:1',
            'visibility'     => 'nullable|string|in:public,admin,organization,organization_admin',
            'is_downloadable'=> 'nullable|boolean',
            'notes'          => 'nullable|string',
            'source_type'    => 'nullable|string|in:geojson,kml,shp,gpkg',
            // The geometry payload (Polygon or MultiPolygon) or Feature with geometry
            'geom_geojson'   => 'nullable|string',
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
