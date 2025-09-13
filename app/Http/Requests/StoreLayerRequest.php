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
            'body_type'   => 'required|string|in:lake,watershed',
            'body_id'     => 'required|integer|min:1',
            'name'        => 'required|string|max:255',
            'type'        => 'nullable|string|max:64',
            'category'    => 'nullable|string|max:64',
            'srid'        => 'nullable|integer|min:0',
            'visibility'  => 'nullable|string|in:admin,public',
            'is_active'   => 'nullable|boolean',
            'status'      => 'nullable|string|in:draft,ready,archived',
            'version'     => 'nullable|integer|min:1',
            'notes'       => 'nullable|string',
            'source_type' => 'nullable|string|in:geojson,json,shp,kml,gpkg,wkt',

            // The geometry payload (Polygon or MultiPolygon), or a Feature with geometry
            'geom_geojson' => 'required|string',
        ];
    }
}
