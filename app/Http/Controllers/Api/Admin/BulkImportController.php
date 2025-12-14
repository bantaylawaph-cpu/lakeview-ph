<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Admin\Concerns\ResolvesTenantContext;
use App\Http\Controllers\Controller;
use App\Models\Parameter;
use App\Services\BulkImportTemplateGenerator;
use App\Services\BulkImportValidator;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BulkImportController extends Controller
{
    use ResolvesTenantContext;

    protected BulkImportTemplateGenerator $templateGenerator;
    protected BulkImportValidator $importValidator;

    public function __construct(
        BulkImportTemplateGenerator $templateGenerator,
        BulkImportValidator $importValidator
    ) {
        $this->templateGenerator = $templateGenerator;
        $this->importValidator = $importValidator;
    }

    /**
     * Download bulk import template (Excel or CSV)
     * GET /api/org/bulk-import/template?format=xlsx
     * GET /api/contrib/bulk-import/template?format=csv
     */
    public function downloadTemplate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'format' => 'required|in:xlsx,csv',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid format. Must be xlsx or csv.',
                'errors' => $validator->errors()
            ], 422);
        }

        $format = $request->input('format', 'xlsx');

        // Get all parameters (parameters are global, not org-specific)
        $parameters = Parameter::query()
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'unit']);

        if ($parameters->isEmpty()) {
            return response()->json([
                'error' => 'No parameters configured. Please contact the administrator.'
            ], 400);
        }

        // Generate template file
        try {
            $result = $this->templateGenerator->generate($parameters, $format);
            
            return response()->download(
                $result['path'],
                $result['filename'],
                ['Content-Type' => $result['mime_type']]
            )->deleteFileAfterSend(true);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to generate template',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Validate uploaded bulk import file
     * POST /api/org/bulk-import/validate
     * POST /api/contrib/bulk-import/validate
     */
    public function validateImport(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'file' => 'required|file|mimes:xlsx,csv|max:10240', // 10MB max
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid file upload',
                'errors' => $validator->errors()
            ], 422);
        }

        $file = $request->file('file');

        // Get all parameters for validation (parameters are global)
        $parameters = Parameter::query()
            ->get(['id', 'code', 'name', 'unit']);

        if ($parameters->isEmpty()) {
            return response()->json([
                'error' => 'No parameters configured.'
            ], 400);
        }

        try {
            $validationResult = $this->importValidator->validate($file, $parameters);

            \Log::info('BulkImport: Validation complete', [
                'valid' => $validationResult['valid'],
                'rowCount' => $validationResult['rowCount'],
                'parameters_count' => count($validationResult['parameters']),
                'errors_count' => count($validationResult['errors']),
            ]);

            return response()->json([
                'valid' => $validationResult['valid'],
                'rowCount' => $validationResult['rowCount'],
                'requiredColumns' => $validationResult['requiredColumns'],
                'parameterColumns' => $validationResult['parameterColumns'],
                'parameters' => $validationResult['parameters'],
                'errors' => $validationResult['errors'],
                'warnings' => $validationResult['warnings'],
            ]);
        } catch (\Exception $e) {
            \Log::error('Bulk import validation error', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'error' => 'Validation failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Download error log CSV
     * POST /api/admin/bulk-import/error-log
     */
    public function downloadErrorLog(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'errors' => 'required|array',
            'errors.*.row' => 'required|integer',
            'errors.*.column' => 'required|string',
            'errors.*.value' => 'nullable|string',
            'errors.*.type' => 'required|string',
            'errors.*.description' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Invalid error data',
                'errors' => $validator->errors()
            ], 422);
        }

        $errors = $request->input('errors');

        // Generate CSV
        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, ['Row Number', 'Column Name', 'Value', 'Error Type', 'Error Description']);

        foreach ($errors as $error) {
            fputcsv($csv, [
                $error['row'],
                $error['column'],
                $error['value'] ?? '',
                $error['type'],
                $error['description']
            ]);
        }

        rewind($csv);
        $content = stream_get_contents($csv);
        fclose($csv);

        $filename = 'import_errors_' . now()->format('Y-m-d_His') . '.csv';

        return response($content, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ]);
    }
}
