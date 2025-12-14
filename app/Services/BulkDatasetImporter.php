<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class BulkDatasetImporter
{
    /**
     * Import validated bulk dataset tests
     *
     * @param array $tests Grouped tests from validator
     * @param int $tenantId
     * @param int $userId
     * @param array $statuses Array of status values ('draft' or 'public') for each test
     * @return array Import result with counts
     */
    public function import(array $tests, int $tenantId, int $userId, array $statuses = []): array
    {
        $importedTests = 0;
        $importedResults = 0;
        $errors = [];

        DB::beginTransaction();

        try {
            // Get parameter mappings
            $parameters = $this->getParameterMappings();

            foreach ($tests as $testIndex => $testData) {
                try {
                    // Get status for this test (default to 'draft' if not specified)
                    $status = isset($statuses[$testIndex]) ? $statuses[$testIndex] : 'draft';
                    
                    // Create sampling event (the "test")
                    $samplingEventId = $this->createSamplingEvent(
                        $testData['lake_id'],
                        $testData['station_id'],
                        $testData['date'],
                        $testData['time'] ?? null,
                        $testData['sampler'],
                        $testData['method'] ?? null,
                        $testData['weather'] ?? null,
                        $tenantId,
                        $userId,
                        $status
                    );

                    // Create sample results (parameter measurements)
                    foreach ($testData['results'] as $result) {
                        $parameterId = $parameters[$result['parameter']] ?? null;
                        
                        if (!$parameterId) {
                            $errors[] = [
                                'row' => $result['row'],
                                'message' => "Parameter '{$result['parameter']}' not found"
                            ];
                            continue;
                        }

                        $this->createSampleResult(
                            $samplingEventId,
                            $parameterId,
                            $result['value'],
                            $result['unit'],
                            $result['depth'],
                            $result['remarks']
                        );

                        $importedResults++;
                    }

                    $importedTests++;

                } catch (\Exception $e) {
                    $errors[] = [
                        'test' => "{$testData['date']} {$testData['time']} - {$testData['sampler']}",
                        'message' => $e->getMessage()
                    ];
                }
            }

            if (!empty($errors)) {
                DB::rollBack();
                return [
                    'success' => false,
                    'message' => 'Import failed due to errors',
                    'errors' => $errors
                ];
            }

            DB::commit();

            return [
                'success' => true,
                'message' => "Successfully imported {$importedTests} tests with {$importedResults} parameter measurements",
                'testCount' => $importedTests,
                'resultCount' => $importedResults
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            
            return [
                'success' => false,
                'message' => 'Import failed: ' . $e->getMessage(),
                'errors' => [$e->getMessage()]
            ];
        }
    }

    /**
     * Create sampling event (which represents the "test")
     */
    private function createSamplingEvent(
        int $lakeId,
        int $stationId,
        string $date,
        ?string $time,
        string $sampler,
        ?string $method,
        ?string $weather,
        int $tenantId,
        int $userId,
        string $status = 'draft'
    ): int {
        // Use the date from Excel template
        $dateTime = $date;

        $data = [
            'lake_id' => $lakeId,
            'station_id' => $stationId,
            'sampled_at' => $dateTime,
            'sampler_name' => $sampler,
            'organization_id' => $tenantId,
            'created_by_user_id' => $userId,
            'status' => $status,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if (!empty($method)) {
            $data['method'] = $method;
        }

        if (!empty($weather)) {
            $data['weather'] = $weather;
        }

        $id = DB::table('sampling_events')->insertGetId($data);

        return $id;
    }

    /**
     * Create sample result (parameter measurement)
     */
    private function createSampleResult(
        int $samplingEventId,
        int $parameterId,
        string $value,
        ?string $unit,
        ?string $depth,
        ?string $remarks
    ): int {
        $data = [
            'sampling_event_id' => $samplingEventId,
            'parameter_id' => $parameterId,
            'value' => floatval($value),
            'unit' => !empty($unit) ? $unit : null,
        ];

        if (!empty($depth) && is_numeric($depth)) {
            $data['depth_m'] = floatval($depth);
        } else {
            $data['depth_m'] = 0; // Default to 0 as per migration
        }

        if (!empty($remarks)) {
            $data['remarks'] = $remarks;
        }

        $id = DB::table('sample_results')->insertGetId($data);

        return $id;
    }

    /**
     * Get parameter ID mappings
     */
    private function getParameterMappings(): array
    {
        $parameters = DB::table('parameters')
            ->select('id', 'name')
            ->get();
        
        $mappings = [];
        foreach ($parameters as $param) {
            $mappings[$param->name] = $param->id;
        }
        
        return $mappings;
    }
}
