<?php

namespace App\Http\Controllers;

use App\Services\BulkDatasetTemplateGenerator;
use App\Services\BulkDatasetValidator;
use App\Services\BulkDatasetImporter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Spreadsheet;

class BulkDatasetController extends Controller
{
    private BulkDatasetTemplateGenerator $templateGenerator;
    private BulkDatasetValidator $validator;
    private BulkDatasetImporter $importer;

    public function __construct(
        BulkDatasetTemplateGenerator $templateGenerator,
        BulkDatasetValidator $validator,
        BulkDatasetImporter $importer
    ) {
        $this->templateGenerator = $templateGenerator;
        $this->validator = $validator;
        $this->importer = $importer;
    }

    /**
     * Download bulk dataset template
     */
    public function downloadTemplate(Request $request)
    {
        \Log::info('BulkDatasetController::downloadTemplate - Request received', [
            'params' => $request->all()
        ]);

        $validator = Validator::make($request->all(), [
            'lake_id' => 'sometimes|integer|exists:lakes,id',
            'station_id' => 'sometimes|integer|exists:stations,id',
            'format' => 'sometimes|in:xlsx,csv'
        ]);

        if ($validator->fails()) {
            \Log::error('BulkDatasetController::downloadTemplate - Validation failed', [
                'errors' => $validator->errors()
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $lakeId = $request->input('lake_id', null);
        $stationId = $request->input('station_id', null);
        $format = $request->input('format', 'xlsx');

        \Log::info('BulkDatasetController::downloadTemplate - Generating template', [
            'lake_id' => $lakeId,
            'station_id' => $stationId,
            'format' => $format
        ]);

        try {
            $spreadsheet = $this->templateGenerator->generate($lakeId, $stationId, $format);
            \Log::info('BulkDatasetController::downloadTemplate - Template generated successfully');
            
            $filename = $this->templateGenerator->getFilename($lakeId, $stationId, $format);

            // Create temporary file
            $tempFile = tempnam(sys_get_temp_dir(), 'bulk_dataset_');
            \Log::info('BulkDatasetController::downloadTemplate - Writing to temp file', ['file' => $tempFile]);
            
            if ($format === 'xlsx') {
                $writer = new Xlsx($spreadsheet);
                $writer->save($tempFile);
                $contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else {
                // CSV format (if needed in future)
                $writer = new \PhpOffice\PhpSpreadsheet\Writer\Csv($spreadsheet);
                $writer->save($tempFile);
                $contentType = 'text/csv';
            }

            \Log::info('BulkDatasetController::downloadTemplate - File written, sending response', [
                'filename' => $filename,
                'filesize' => filesize($tempFile)
            ]);

            return response()->download($tempFile, $filename, [
                'Content-Type' => $contentType,
            ])->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            \Log::error('BulkDatasetController::downloadTemplate - Exception', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'message' => 'Error generating template',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function validateFile(Request $request)
    {
        \Log::info('BulkDatasetController::validateFile - Request received', [
            'has_file' => $request->hasFile('file'),
            'all_inputs' => $request->all(),
            'files' => $request->allFiles(),
        ]);

        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            \Log::error('BulkDatasetController::validateFile - Validation failed', [
                'errors' => $validator->errors()
            ]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $file = $request->file('file');
            \Log::info('BulkDatasetController::validateFile - File received', [
                'original_name' => $file->getClientOriginalName(),
                'size' => $file->getSize(),
                'mime' => $file->getMimeType(),
            ]);
            
            // Store file temporarily using local disk (not supabase)
            $filePath = $file->store('temp', 'local');
            $fullPath = Storage::disk('local')->path($filePath);
            
            \Log::info('BulkDatasetController::validateFile - File stored', [
                'path' => $fullPath,
                'exists' => file_exists($fullPath),
            ]);
            
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($fullPath);
            $instructionsSheet = $spreadsheet->getSheetByName('Instructions');
            
            if (!$instructionsSheet) {
                Storage::disk('local')->delete($filePath);
                \Log::error('BulkDatasetController::validateFile - Instructions sheet not found');
                throw new \Exception('Invalid template file. Instructions sheet not found.');
            }
            
            $lakeId = $instructionsSheet->getCell('D3')->getValue();
            $stationId = $instructionsSheet->getCell('D4')->getValue();
            
            \Log::info('BulkDatasetController::validateFile - Metadata extracted', [
                'lake_id' => $lakeId,
                'station_id' => $stationId,
            ]);
            
            if (!$lakeId || !$stationId) {
                Storage::disk('local')->delete($filePath);
                \Log::error('BulkDatasetController::validateFile - Missing lake or station ID');
                throw new \Exception('Invalid template file. Lake and Station information not found. Please download a new template.');
            }

            // Validate file content (use the same path we loaded the spreadsheet from)
            \Log::info('BulkDatasetController::validateFile - Starting validation');
            $validationResult = $this->validator->validate($fullPath, $lakeId, $stationId);
            
            \Log::info('BulkDatasetController::validateFile - Validation complete', [
                'valid' => $validationResult['valid'] ?? false,
                'error_count' => count($validationResult['errors'] ?? []),
                'test_count' => $validationResult['test_count'] ?? 0,
                'result_count' => $validationResult['result_count'] ?? 0,
                'tests_array_count' => count($validationResult['tests'] ?? []),
            ]);
            
            // Clean up temp file
            Storage::disk('local')->delete($filePath);

            return response()->json($validationResult);

        } catch (\Exception $e) {
            \Log::error('BulkDatasetController::validateFile - Exception', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
                'class' => get_class($e),
            ]);
            
            // Clean up temp file if it exists
            if (isset($filePath)) {
                try {
                    Storage::disk('local')->delete($filePath);
                } catch (\Exception $cleanupError) {
                    \Log::warning('Failed to cleanup temp file', ['error' => $cleanupError->getMessage()]);
                }
            }
            
            return response()->json([
                'valid' => false,
                'message' => 'Error validating file: ' . $e->getMessage(),
                'errors' => [
                    [
                        'row' => 0,
                        'column' => 'general',
                        'description' => $e->getMessage()
                    ]
                ]
            ], 500);
        }
    }

    /**
     * Import validated data
     */
    public function import(Request $request)
    {
        \Log::info('BulkDatasetController::import - Starting import');
        
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,xls|max:10240',
            'statuses' => 'sometimes|json',
        ]);

        if ($validator->fails()) {
            \Log::error('BulkDatasetController::import - Validation failed', ['errors' => $validator->errors()]);
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Extract lake_id and station_id from file
            $file = $request->file('file');
            
            // Store file temporarily using local disk (not supabase)
            $filePath = $file->store('temp', 'local');
            $fullPath = Storage::disk('local')->path($filePath);
            
            \Log::info('BulkDatasetController::import - File stored', ['path' => $fullPath]);
            
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($fullPath);
            $instructionsSheet = $spreadsheet->getSheetByName('Instructions');
            
            if (!$instructionsSheet) {
                Storage::disk('local')->delete($filePath);
                throw new \Exception('Invalid template file. Instructions sheet not found.');
            }
            
            $lakeId = $instructionsSheet->getCell('D3')->getValue();
            $stationId = $instructionsSheet->getCell('D4')->getValue();
            
            \Log::info('BulkDatasetController::import - Metadata extracted', ['lake_id' => $lakeId, 'station_id' => $stationId]);
            
            if (!$lakeId || !$stationId) {
                Storage::disk('local')->delete($filePath);
                throw new \Exception('Invalid template file. Lake and Station information not found.');
            }
            
            $user = $request->user();

            // Get tenant ID from user
            $tenantId = $user->tenant_id;
            
            \Log::info('BulkDatasetController::import - User and tenant info', [
                'user_id' => $user->id,
                'tenant_id' => $tenantId
            ]);

            if (!$tenantId) {
                Storage::disk('local')->delete($filePath);
                \Log::error('BulkDatasetController::import - No tenant found for user');
                return response()->json([
                    'success' => false,
                    'message' => 'Tenant not found for user'
                ], 403);
            }

            // Validate file first
            \Log::info('BulkDatasetController::import - Starting validation');
            $validationResult = $this->validator->validate($fullPath, $lakeId, $stationId);

            if (!$validationResult['valid']) {
                Storage::disk('local')->delete($filePath);
                \Log::error('BulkDatasetController::import - Validation failed', ['errors' => $validationResult['errors']]);
                return response()->json([
                    'success' => false,
                    'message' => 'Validation failed. Please fix errors and try again.',
                    'errors' => $validationResult['errors']
                ], 422);
            }

            // Import data
            \Log::info('BulkDatasetController::import - Starting data import', ['test_count' => count($validationResult['tests'])]);
            $tests = $validationResult['tests'];
            
            // Get statuses from request (array of 'draft' or 'public' for each test)
            $statusesJson = $request->input('statuses');
            $statuses = [];
            if ($statusesJson) {
                $statuses = json_decode($statusesJson, true) ?? [];
            }
            
            // Contributors can only import as draft
            if ($user->role === 'contrib') {
                $statuses = array_fill(0, count($tests), 'draft');
            }
            
            \Log::info('BulkDatasetController::import - Statuses', ['statuses' => $statuses, 'user_role' => $user->role]);
            
            $importResult = $this->importer->import($tests, $tenantId, $user->id, $statuses);
            
            \Log::info('BulkDatasetController::import - Import completed', ['result' => $importResult]);

            // Clean up temp file
            Storage::disk('local')->delete($filePath);

            if ($importResult['success']) {
                return response()->json($importResult, 200);
            } else {
                return response()->json($importResult, 500);
            }

        } catch (\Exception $e) {
            \Log::error('BulkDatasetController::import - Exception occurred', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error importing data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download error log
     */
    public function downloadErrorLog(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'errors' => 'required|array',
        ]);

        if ($validator->fails()) {
            \Log::error('BulkDatasetController::downloadErrorLog - Validation failed', [
                'errors' => $validator->errors(),
                'received' => $request->all()
            ]);
            return response()->json([
                'message' => 'Invalid error data',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $errors = $request->input('errors', []);
            $warnings = $request->input('warnings', []);
            
            // Create spreadsheet for error log
            $spreadsheet = new Spreadsheet();
            $sheet = $spreadsheet->getActiveSheet();
            $sheet->setTitle('Validation Issues');

            // Headers
            $sheet->setCellValue('A1', 'Type');
            $sheet->setCellValue('B1', 'Row');
            $sheet->setCellValue('C1', 'Column');
            $sheet->setCellValue('D1', 'Description');
            
            $sheet->getStyle('A1:D1')->getFont()->setBold(true);
            $sheet->getStyle('A1:D1')->getFill()
                ->setFillType(\PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID)
                ->getStartColor()->setRGB('FF0000');
            $sheet->getStyle('A1:D1')->getFont()->getColor()->setRGB('FFFFFF');

            // Add errors
            $row = 2;
            foreach ($errors as $error) {
                $sheet->setCellValue('A' . $row, 'ERROR');
                $sheet->setCellValue('B' . $row, $error['row'] ?? '');
                $sheet->setCellValue('C' . $row, $error['column'] ?? '');
                $sheet->setCellValue('D' . $row, $error['description'] ?? $error['message'] ?? '');
                $sheet->getStyle('A' . $row)->getFont()->getColor()->setRGB('FF0000');
                $row++;
            }
            
            // Add warnings
            foreach ($warnings as $warning) {
                $sheet->setCellValue('A' . $row, 'WARNING');
                $sheet->setCellValue('B' . $row, $warning['row'] ?? '');
                $sheet->setCellValue('C' . $row, $warning['column'] ?? '');
                $sheet->setCellValue('D' . $row, $warning['description'] ?? $warning['message'] ?? '');
                $sheet->getStyle('A' . $row)->getFont()->getColor()->setRGB('FFA500');
                $row++;
            }

            // Auto-size columns
            $sheet->getColumnDimension('A')->setWidth(10);
            $sheet->getColumnDimension('B')->setWidth(10);
            $sheet->getColumnDimension('C')->setWidth(15);
            $sheet->getColumnDimension('D')->setWidth(80);

            // Create temporary file
            $tempFile = tempnam(sys_get_temp_dir(), 'error_log_');
            $writer = new Xlsx($spreadsheet);
            $writer->save($tempFile);

            $filename = 'validation_errors_' . date('Y-m-d_His') . '.xlsx';

            return response()->download($tempFile, $filename, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ])->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Error generating error log',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
