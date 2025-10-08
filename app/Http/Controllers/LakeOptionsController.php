<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;

class LakeOptionsController extends Controller
{
    private function flattenDistinct(string $column): array
    {
        $rows = DB::table('lakes')->select($column)->whereNotNull($column)->get()->pluck($column)->filter();
        $vals = [];
        foreach ($rows as $r) {
            // Rows may already be decoded (array) or raw JSON / scalar
            if (is_array($r)) {
                foreach ($r as $v) { if (is_string($v) && $v !== '') $vals[] = $v; }
                continue;
            }
            // Try decode JSON
            if (is_string($r) && str_starts_with($r, '[')) {
                $decoded = json_decode($r, true);
                if (is_array($decoded)) {
                    foreach ($decoded as $v) { if (is_string($v) && $v !== '') $vals[] = $v; }
                    continue;
                }
            }
            if (is_string($r) && $r !== '') {
                $vals[] = $r;
            }
        }
        $vals = array_values(array_unique($vals));
        sort($vals, SORT_NATURAL | SORT_FLAG_CASE);
        return $vals;
    }

    public function regions()
    {
        return response()->json($this->flattenDistinct('region'));
    }

    public function provinces()
    {
        return response()->json($this->flattenDistinct('province'));
    }

    public function municipalities()
    {
        return response()->json($this->flattenDistinct('municipality'));
    }
}
