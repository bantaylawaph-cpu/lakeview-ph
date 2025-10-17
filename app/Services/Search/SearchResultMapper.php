<?php

namespace App\Services\Search;

/**
 * Maps raw DB rows into a unified API shape and builds human descriptions.
 */
class SearchResultMapper
{
    public function mapRows(array $rows, string $table, ?string $attributeUsed = null, ?string $place = null): array
    {
        return array_map(function ($r) use ($table, $attributeUsed) {
            $row = is_array($r) ? $r : (array) $r;
            $id = $row['id'] ?? ($row['lake_id'] ?? ($row['layer_id'] ?? ($row['parameter_id'] ?? null)));
            $name = $row['name'] ?? ($row['lake_name'] ?? ($row['watershed_name'] ?? ($row['layer_name'] ?? ($row['parameter_name'] ?? null))));
            $geom = $row['geom'] ?? ($row['coordinates_geojson'] ?? null);

            if ($table === 'lakes') {
                $normText = function ($v) {
                    if ($v === null) return '';
                    if (is_array($v)) return (string)($v[0] ?? '');
                    if (is_string($v)) {
                        $s = trim($v);
                        if ($s !== '' && ($s[0] === '[' || $s[0] === '{')) {
                            try {
                                $j = json_decode($s, true, 512, JSON_THROW_ON_ERROR);
                                return (string)(($j[0] ?? '') ?: '');
                            } catch (\Throwable $e) {
                                return $s;
                            }
                        }
                        return $s;
                    }
                    return (string)$v;
                };
                $province = $normText($row['province'] ?? null);
                $region = $normText($row['region'] ?? null);
                $locParts = [];
                if ($province !== '') $locParts[] = $province;
                if ($region !== '') $locParts[] = $region;
                $loc = implode(', ', $locParts);

                $areaNum = null; $unit = null;
                foreach (['surface_area_km2', 'area_km2'] as $k) {
                    if (isset($row[$k]) && is_numeric($row[$k])) {
                        $areaNum = (float)$row[$k];
                        $unit = 'km²';
                        break;
                    }
                }
                if ($areaNum === null) {
                    foreach (['surface_area_ha', 'area_ha'] as $k) {
                        if (isset($row[$k]) && is_numeric($row[$k])) {
                            $areaNum = (float)$row[$k];
                            $unit = 'ha';
                            break;
                        }
                    }
                }
                if ($areaNum === null && isset($row['area_km2_from_layer']) && is_numeric($row['area_km2_from_layer'])) {
                    $areaNum = (float)$row['area_km2_from_layer'];
                    $unit = 'km²';
                }

                $metricText = '';
                if ($attributeUsed && isset($row['metric_value']) && is_numeric($row['metric_value'])) {
                    $mv = (float)$row['metric_value'];
                    if ($attributeUsed === 'depth') {
                        $metricText = 'with a mean depth of ' . rtrim(rtrim(number_format($mv, 1, '.', ''), '0'), '.') . ' m';
                    } elseif ($attributeUsed === 'elevation') {
                        $metricText = 'with an elevation of ' . rtrim(rtrim(number_format($mv, 1, '.', ''), '0'), '.') . ' m';
                    } elseif ($attributeUsed === 'shoreline_m') {
                        $km = $mv / 1000.0;
                        $metricText = 'with a shoreline length of ' . rtrim(rtrim(number_format($km, 1, '.', ''), '0'), '.') . ' km';
                    } elseif ($attributeUsed === 'area_m2') {
                        $km2 = $mv / 1000000.0;
                        $metricText = 'with a surface area of ' . rtrim(rtrim(number_format($km2, 2, '.', ''), '0'), '.') . ' km²';
                    }
                }

                $areaText = $areaNum !== null ? (rtrim(rtrim(number_format($areaNum, 2, '.', ''), '0'), '.') . ($unit ? " {$unit}" : '')) : '';
                $parts = [];
                if ($loc !== '') $parts[] = sprintf('%s is in %s', $name, $loc); else $parts[] = sprintf('%s is a lake', $name);
                if ($metricText !== '') {
                    $parts[] = $metricText;
                } elseif ($areaText !== '') {
                    $parts[] = sprintf('with the surface area of %s', $areaText);
                }
                $desc = implode(' ', $parts) . '.';
                $row['description'] = $desc;
            }

            return [
                'table' => $table,
                'id' => $id,
                'name' => $name,
                'attributes' => $row,
                'geom' => $geom,
                'attribute_used' => $attributeUsed,
            ];
        }, $rows);
    }
}
