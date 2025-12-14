<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use Illuminate\Support\Facades\DB;

class BulkDatasetValidator
{
    private array $errors = [];
    private array $warnings = [];
    private array $tests = [];
    private int $totalResults = 0;

    // Column mapping for row-based structure
    private const COLUMNS = [
        'test_date' => 'A',
        'method' => 'B',
        'weather' => 'C',
        'sampler_name' => 'D',
        'parameter' => 'E',
        'value' => 'F',
        'unit' => 'G',
        'depth_m' => 'H',
        'remarks' => 'I',
    ];

    /**
     * Validate uploaded bulk dataset file with row-based structure
     *
     * @param string $filePath Path to uploaded file
     * @param int $lakeId
     * @param int $stationId
     * @return array Validation result with errors, warnings, test count, result count
     */
    public function validate(string $filePath, int $lakeId, int $stationId): array
    {
        $this->errors = [];
        $this->warnings = [];
        $this->tests = [];
        $this->totalResults = 0;

        try {
            $spreadsheet = IOFactory::load($filePath);
            $sheet = $spreadsheet->getSheetByName('Data');
            
            if (!$sheet) {
                $sheet = $spreadsheet->getSheet(0);
            }

            $rows = $sheet->toArray(null, true, true, true);
            
            // Remove header row
            $header = array_shift($rows);
            
            // Validate headers
            $this->validateHeaders($header);
            
            if (!empty($this->errors)) {
                return $this->getValidationResult();
            }

            // Get valid parameters from database
            $validParameters = $this->getValidParameters();
            
            // Group rows into tests
            $this->groupRowsIntoTests($rows, $validParameters, $lakeId, $stationId);
            
            // Validate at least one test exists
            if (empty($this->tests) && empty($this->errors)) {
                $this->addError(0, 'general', 'No valid test data found in file');
            }

        } catch (\Exception $e) {
            $this->addError(0, 'file', 'Error reading file: ' . $e->getMessage());
        }

        return $this->getValidationResult();
    }

    /**
     * Validate column headers
     */
    private function validateHeaders(array $header): void
    {
        $expectedHeaders = [
            'A' => 'test_date*',
            'B' => 'method*',
            'C' => 'weather*',
            'D' => 'sampler_name*',
            'E' => 'parameter*',
            'F' => 'value*',
            'G' => 'unit*',
            'H' => 'depth_m',
            'I' => 'remarks',
        ];

        foreach ($expectedHeaders as $col => $expected) {
            $actual = isset($header[$col]) ? strtolower(trim($header[$col])) : '';
            $expectedLower = strtolower($expected);
            
            if ($actual !== $expectedLower) {
                $this->addError(1, 'header', "Column $col: Expected '$expected' but found '$actual'");
            }
        }
    }

    /**
     * Group rows into tests based on test_date presence
     */
    private function groupRowsIntoTests(array $rows, array $validParameters, int $lakeId, int $stationId): void
    {
        $currentTest = null;
        $rowNumber = 2; // Start from row 2 (after header)
        
        foreach ($rows as $row) {
            // Skip completely empty rows
            if ($this->isCompletelyEmptyRow($row)) {
                $rowNumber++;
                continue;
            }

            $testDate = trim($row[self::COLUMNS['test_date']] ?? '');
            
            // Check if this is a test header row (test_date is filled)
            if (!empty($testDate)) {
                // Save previous test if exists
                if ($currentTest !== null) {
                    $this->tests[] = $currentTest;
                }
                
                // Start new test
                $currentTest = $this->createTestFromHeaderRow($row, $rowNumber, $validParameters, $lakeId, $stationId);
                
                // If test creation failed, skip to next row
                if ($currentTest === null) {
                    $rowNumber++;
                    continue;
                }
            } else {
                // This is a parameter row for the current test
                if ($currentTest === null) {
                    $this->addError($rowNumber, 'structure', 'Parameter row found without a preceding test header row');
                    $rowNumber++;
                    continue;
                }
                
                // Add parameter to current test
                $this->addParameterToTest($currentTest, $row, $rowNumber, $validParameters);
            }
            
            $rowNumber++;
        }
        
        // Don't forget to save the last test
        if ($currentTest !== null) {
            $this->tests[] = $currentTest;
        }
    }

    /**
     * Create a new test from a header row
     */
    private function createTestFromHeaderRow(array $row, int $rowNumber, array $validParameters, int $lakeId, int $stationId): ?array
    {
        $testDate = trim($row[self::COLUMNS['test_date']] ?? '');
        $method = trim($row[self::COLUMNS['method']] ?? '');
        $weather = trim($row[self::COLUMNS['weather']] ?? '');
        $samplerName = trim($row[self::COLUMNS['sampler_name']] ?? '');
        $parameter = trim($row[self::COLUMNS['parameter']] ?? '');
        
        // Validate required test header fields
        $hasError = false;
        
        if (empty($testDate)) {
            $this->addError($rowNumber, 'test_date', 'Test date is required for test header row');
            $hasError = true;
        } else {
            $normalizedDate = $this->normalizeDate($testDate);
            if (!$normalizedDate) {
                $this->addError($rowNumber, 'test_date', "Invalid date format: $testDate");
                $hasError = true;
            }
        }
        
        if (empty($method)) {
            $this->addError($rowNumber, 'method', 'Method is required for test header row');
            $hasError = true;
        } elseif (!array_key_exists($method, $this->getMethodOptions())) {
            $this->addError($rowNumber, 'method', "Invalid method: $method");
            $hasError = true;
        }
        
        if (empty($weather)) {
            $this->addError($rowNumber, 'weather', 'Weather is required for test header row');
            $hasError = true;
        } elseif (!array_key_exists($weather, $this->getWeatherOptions())) {
            $this->addError($rowNumber, 'weather', "Invalid weather: $weather");
            $hasError = true;
        }
        
        if (empty($samplerName)) {
            $this->addError($rowNumber, 'sampler_name', 'Sampler name is required for test header row');
            $hasError = true;
        }
        
        // Test header row must have at least one parameter
        if (empty($parameter)) {
            $this->addError($rowNumber, 'parameter', 'Test header row must include at least one parameter');
            $hasError = true;
        }
        
        if ($hasError) {
            return null;
        }
        
        // Create test structure with keys expected by importer
        $test = [
            'lake_id' => $lakeId,
            'station_id' => $stationId,
            'date' => $this->normalizeDate($testDate),
            'time' => '00:00', // Default time
            'method' => $method,
            'weather' => $weather,
            'sampler' => $samplerName, // Importer expects 'sampler' not 'sampler_name'
            'results' => [],
        ];
        
        // Add the first parameter from the header row
        $this->addParameterToTest($test, $row, $rowNumber, $validParameters);
        
        return $test;
    }

    /**
     * Add a parameter measurement to a test
     */
    private function addParameterToTest(array &$test, array $row, int $rowNumber, array $validParameters): void
    {
        $parameter = trim($row[self::COLUMNS['parameter']] ?? '');
        $value = trim($row[self::COLUMNS['value']] ?? '');
        $unit = trim($row[self::COLUMNS['unit']] ?? '');
        $depthM = trim($row[self::COLUMNS['depth_m']] ?? '');
        $remarks = trim($row[self::COLUMNS['remarks']] ?? '');
        
        // Skip if parameter is empty (allowed for parameter rows if they want to skip)
        if (empty($parameter) && empty($value)) {
            return;
        }
        
        // Validate parameter
        if (empty($parameter)) {
            $this->addError($rowNumber, 'parameter', 'Parameter name is required when value is provided');
            return;
        }
        
        if (!isset($validParameters[$parameter])) {
            $this->addError($rowNumber, 'parameter', "Unknown parameter: $parameter");
            return;
        }
        
        // Validate value
        if (empty($value) && $value !== '0') {
            $this->addError($rowNumber, 'value', 'Value is required for parameter measurement');
            return;
        }
        
        if (!is_numeric($value)) {
            $this->addError($rowNumber, 'value', "Value must be numeric: $value");
            return;
        }
        
        // Validate unit - only required if parameter has a unit defined
        $parameterInfo = $validParameters[$parameter];
        $expectedUnit = $parameterInfo->unit ?? null;
        
        // If parameter has no unit defined (like pH), accept empty unit
        if ($expectedUnit !== null && $expectedUnit !== '' && empty($unit)) {
            $this->addError($rowNumber, 'unit', 'Unit is required for parameter measurement');
            return;
        }
        
        // If parameter has no unit, but user provided one, warn them
        if (($expectedUnit === null || $expectedUnit === '') && !empty($unit)) {
            $this->addWarning($rowNumber, 'unit', "Parameter '$parameter' typically has no unit, but '$unit' was provided");
        }
        
        // Validate depth (optional, defaults to 0)
        $depth = 0;
        if (!empty($depthM)) {
            if (!is_numeric($depthM)) {
                $this->addWarning($rowNumber, 'depth_m', "Depth must be numeric, defaulting to 0");
            } else {
                $depth = (float)$depthM;
            }
        }
        
        // Add result to test
        $test['results'][] = [
            'parameter' => $parameter,
            'value' => (float)$value,
            'unit' => $unit,
            'depth' => $depth,
            'remarks' => $remarks,
            'row' => $rowNumber,
        ];
        
        $this->totalResults++;
    }

    /**
     * Check if row is completely empty
     */
    private function isCompletelyEmptyRow(array $row): bool
    {
        foreach ($row as $cell) {
            if (!empty(trim($cell))) {
                return false;
            }
        }
        return true;
    }

    /**
     * Normalize date to Y-m-d format
     */
    private function normalizeDate($dateValue): ?string
    {
        if (empty($dateValue)) {
            return null;
        }

        // If it's a numeric Excel date
        if (is_numeric($dateValue)) {
            try {
                $dateTime = ExcelDate::excelToDateTimeObject($dateValue);
                return $dateTime->format('Y-m-d');
            } catch (\Exception $e) {
                return null;
            }
        }

        // Try to parse various date formats
        $formats = [
            'Y-m-d',
            'Y/m/d',
            'd/m/Y',
            'd-m-Y',
            'm/d/Y',
            'm-d-Y',
        ];

        foreach ($formats as $format) {
            $date = \DateTime::createFromFormat($format, $dateValue);
            if ($date !== false && $date->format($format) === $dateValue) {
                return $date->format('Y-m-d');
            }
        }

        // Try strtotime as fallback
        $timestamp = strtotime($dateValue);
        if ($timestamp !== false) {
            return date('Y-m-d', $timestamp);
        }

        return null;
    }

    /**
     * Get valid parameters from database
     */
    private function getValidParameters(): array
    {
        $parameters = DB::table('parameters')
            ->select('id', 'name', 'code', 'unit')
            ->get();

        $validParameters = [];
        foreach ($parameters as $param) {
            $validParameters[$param->name] = $param;
            if (!empty($param->code)) {
                $validParameters[$param->code] = $param;
            }
        }

        return $validParameters;
    }

    /**
     * Get method options
     */
    private function getMethodOptions(): array
    {
        return [
            'manual' => 'Manual Grab Sampling',
            'automatic' => 'Automatic Sampling',
        ];
    }

    /**
     * Get weather options
     */
    private function getWeatherOptions(): array
    {
        return [
            'sunny' => 'Sunny',
            'partly_cloudy' => 'Partly Cloudy',
            'cloudy' => 'Cloudy',
            'rainy' => 'Rainy',
            'stormy' => 'Stormy',
            'foggy' => 'Foggy',
            'windy' => 'Windy',
            'overcast' => 'Overcast',
        ];
    }

    /**
     * Add validation error
     */
    private function addError(int $row, string $field, string $message): void
    {
        $this->errors[] = [
            'row' => $row,
            'field' => $field,
            'message' => $message,
            'type' => 'error'
        ];
    }

    /**
     * Add validation warning
     */
    private function addWarning(int $row, string $field, string $message): void
    {
        $this->warnings[] = [
            'row' => $row,
            'field' => $field,
            'message' => $message,
            'type' => 'warning'
        ];
    }

    /**
     * Get validation result
     */
    private function getValidationResult(): array
    {
        return [
            'valid' => empty($this->errors),
            'errors' => $this->errors,
            'warnings' => $this->warnings,
            'tests' => $this->tests,
            'testCount' => count($this->tests),
            'resultCount' => $this->totalResults,
        ];
    }

    /**
     * Get tests for import
     */
    public function getTests(): array
    {
        return $this->tests;
    }
}
