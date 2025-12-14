<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\IOFactory;

class BulkImportValidator
{
    /**
     * Validate uploaded bulk import file
     *
     * @param UploadedFile $file
     * @param Collection $parameters Collection of Parameter models
     * @return array Validation results
     */
    public function validate(UploadedFile $file, Collection $parameters): array
    {
        $errors = [];
        $warnings = [];
        $validatedParameters = [];

        try {
            // Load spreadsheet
            $spreadsheet = IOFactory::load($file->getPathname());
            $sheet = $spreadsheet->getActiveSheet();
            $rows = $sheet->toArray();

            // Debug: Log what we're reading
            \Log::info('BulkImport: File loaded', [
                'total_rows' => count($rows),
                'first_3_rows' => array_slice($rows, 0, 3)
            ]);

            // Schema validation
            if (empty($rows)) {
                return [
                    'valid' => false,
                    'rowCount' => 0,
                    'requiredColumns' => 0,
                    'parameterColumns' => 0,
                    'parameters' => [],
                    'errors' => [['row' => 0, 'column' => 'File', 'value' => '', 'type' => 'Hard Error', 'description' => 'File is empty']],
                    'warnings' => [],
                ];
            }

            $headers = array_map('trim', $rows[0]);
            $requiredHeaders = ['Parameter', 'Value', 'Depth_m'];

            // Check for required columns
            foreach ($requiredHeaders as $required) {
                if (!in_array($required, $headers, true)) {
                    $errors[] = [
                        'row' => 1,
                        'column' => $required,
                        'value' => '',
                        'type' => 'Hard Error',
                        'description' => "Missing required column: {$required}"
                    ];
                }
            }

            if (!empty($errors)) {
                return [
                    'valid' => false,
                    'rowCount' => count($rows) - 1,
                    'requiredColumns' => count($requiredHeaders),
                    'parameterColumns' => 0,
                    'parameters' => [],
                    'errors' => $errors,
                    'warnings' => [],
                ];
            }

            // Get column indices
            $parameterCol = array_search('Parameter', $headers);
            $valueCol = array_search('Value', $headers);
            $unitCol = array_search('Unit', $headers); // Optional column
            $depthCol = array_search('Depth_m', $headers);
            $remarksCol = array_search('Remarks', $headers);

            // Create parameter lookup map
            $parameterMap = [];
            foreach ($parameters as $param) {
                $parameterMap[strtolower($param->code)] = $param;
                $parameterMap[strtolower($param->name)] = $param;
            }

            // Value validation - start from row 2 (skip header)
            $dataRowCount = 0;
            for ($i = 1; $i < count($rows); $i++) {
                $row = $rows[$i];
                $rowNumber = $i + 1;

                // Skip completely empty rows
                if (empty(array_filter($row))) {
                    \Log::info("BulkImport: Skipping empty row {$rowNumber}");
                    continue;
                }

                $dataRowCount++;

                $parameterName = isset($row[$parameterCol]) ? trim($row[$parameterCol]) : '';
                $value = isset($row[$valueCol]) ? trim($row[$valueCol]) : '';
                $depth = isset($row[$depthCol]) ? trim($row[$depthCol]) : '0';
                $remarks = isset($row[$remarksCol]) ? trim($row[$remarksCol]) : '';

                \Log::info("BulkImport: Processing row {$rowNumber}", [
                    'parameter' => $parameterName,
                    'value' => $value,
                    'depth' => $depth,
                    'parameterCol' => $parameterCol,
                    'valueCol' => $valueCol,
                    'depthCol' => $depthCol
                ]);

                // Validate Parameter
                if (empty($parameterName)) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'column' => 'Parameter',
                        'value' => $parameterName,
                        'type' => 'Hard Error',
                        'description' => 'Parameter is required'
                    ];
                    continue;
                }

                // Check if parameter exists
                $matchedParameter = $parameterMap[strtolower($parameterName)] ?? null;
                if (!$matchedParameter) {
                    \Log::warning("BulkImport: Parameter not found in system", [
                        'row' => $rowNumber,
                        'parameter' => $parameterName,
                        'available_keys' => array_keys($parameterMap)
                    ]);
                    $errors[] = [
                        'row' => $rowNumber,
                        'column' => 'Parameter',
                        'value' => $parameterName,
                        'type' => 'Hard Error',
                        'description' => "Parameter '{$parameterName}' not found in system"
                    ];
                    continue;
                }

                \Log::info("BulkImport: Parameter matched", [
                    'row' => $rowNumber,
                    'input' => $parameterName,
                    'matched_code' => $matchedParameter->code,
                    'matched_name' => $matchedParameter->name
                ]);

                // Validate Value
                if ($value === '' || $value === null) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'column' => 'Value',
                        'value' => $value,
                        'type' => 'Hard Error',
                        'description' => 'Value is required'
                    ];
                    continue;
                }

                if (!is_numeric($value)) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'column' => 'Value',
                        'value' => $value,
                        'type' => 'Hard Error',
                        'description' => 'Value must be numeric'
                    ];
                    continue;
                }

                $numericValue = (float) $value;
                if ($numericValue < 0) {
                    $errors[] = [
                        'row' => $rowNumber,
                        'column' => 'Value',
                        'value' => $value,
                        'type' => 'Hard Error',
                        'description' => 'Value cannot be negative'
                    ];
                    continue;
                }

                // Validate Depth
                if ($depth !== '' && $depth !== null) {
                    if (!is_numeric($depth)) {
                        $errors[] = [
                            'row' => $rowNumber,
                            'column' => 'Depth_m',
                            'value' => $depth,
                            'type' => 'Hard Error',
                            'description' => 'Depth must be numeric'
                        ];
                        continue;
                    }

                    $numericDepth = (float) $depth;
                    if ($numericDepth < 0) {
                        $errors[] = [
                            'row' => $rowNumber,
                            'column' => 'Depth_m',
                            'value' => $depth,
                            'type' => 'Hard Error',
                            'description' => 'Depth cannot be negative'
                        ];
                        continue;
                    }
                }

                // Add to validated parameters
                $validatedParameters[] = [
                    'parameter' => $matchedParameter->code,
                    'parameter_id' => $matchedParameter->id,
                    'value' => $numericValue,
                    'unit' => $matchedParameter->unit ?? '—',
                    'depth_m' => $depth !== '' ? (float) $depth : 0,
                    'remarks' => $remarks
                ];
                
                \Log::info("BulkImport: Parameter validated and added", [
                    'row' => $rowNumber,
                    'parameter' => $matchedParameter->code,
                    'value' => $numericValue
                ]);
            }

            // Check row count limit
            if ($dataRowCount > 5000) {
                $errors[] = [
                    'row' => 0,
                    'column' => 'File',
                    'value' => '',
                    'type' => 'Hard Error',
                    'description' => "Too many rows ({$dataRowCount}). Maximum allowed is 5,000 rows."
                ];
            }

            // Check if no data rows
            if ($dataRowCount === 0) {
                $errors[] = [
                    'row' => 0,
                    'column' => 'File',
                    'value' => '',
                    'type' => 'Hard Error',
                    'description' => 'No data rows found in file'
                ];
            }

            return [
                'valid' => empty($errors),
                'rowCount' => count($validatedParameters),
                'requiredColumns' => count($requiredHeaders),
                'parameterColumns' => count($parameters),
                'parameters' => $validatedParameters,
                'errors' => $errors,
                'warnings' => $warnings,
            ];
        } catch (\Exception $e) {
            return [
                'valid' => false,
                'rowCount' => 0,
                'requiredColumns' => 0,
                'parameterColumns' => 0,
                'parameters' => [],
                'errors' => [
                    [
                        'row' => 0,
                        'column' => 'File',
                        'value' => '',
                        'type' => 'Hard Error',
                        'description' => 'Failed to read file: ' . $e->getMessage()
                    ]
                ],
                'warnings' => [],
            ];
        }
    }
}
