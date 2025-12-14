<?php

namespace App\Services;

use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Writer\Csv as CsvWriter;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;

class BulkImportTemplateGenerator
{
    /**
     * Generate bulk import template file
     *
     * @param Collection $parameters Collection of Parameter models
     * @param string $format 'xlsx' or 'csv'
     * @return array ['path' => string, 'filename' => string, 'mime_type' => string]
     */
    public function generate(Collection $parameters, string $format = 'xlsx'): array
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Define column headers
        $headers = [
            'Parameter',
            'Value',
            'Unit',
            'Depth_m',
            'Remarks'
        ];

        // Set headers in row 1
        $colLetters = ['A', 'B', 'C', 'D', 'E'];
        foreach ($headers as $index => $header) {
            $cellCoordinate = $colLetters[$index] . '1';
            $sheet->setCellValue($cellCoordinate, $header);
            
            // Style header cells (only for Excel)
            if ($format === 'xlsx') {
                $sheet->getStyle($cellCoordinate)->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'color' => ['rgb' => 'FFFFFF'],
                        'size' => 11,
                    ],
                    'fill' => [
                        'fillType' => Fill::FILL_SOLID,
                        'startColor' => ['rgb' => '3B82F6'], // Blue background
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_LEFT,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);
            }
        }

        // Add all parameters as rows with Parameter and Unit pre-filled
        // User will fill in Value, Depth_m, and Remarks
        $row = 2;
        foreach ($parameters as $parameter) {
            $sheet->setCellValue('A' . $row, $parameter->code ?? $parameter->name);
            $sheet->setCellValue('B' . $row, ''); // Value - to be filled by user
            $sheet->setCellValue('C' . $row, $parameter->unit ?? '');
            $sheet->setCellValue('D' . $row, ''); // Depth_m - to be filled by user
            $sheet->setCellValue('E' . $row, ''); // Remarks - to be filled by user
            $row++;
        }

        // Auto-size columns (only for Excel)
        if ($format === 'xlsx') {
            foreach ($colLetters as $columnLetter) {
                $sheet->getColumnDimension($columnLetter)->setAutoSize(true);
            }
        }

        // Add instruction comment/note (only for Excel)
        if ($format === 'xlsx') {
            $instructionCol = 'G';
            $sheet->setCellValue($instructionCol . '1', 'Instructions:');
            $sheet->setCellValue($instructionCol . '2', '1. Parameter column is pre-filled with all available parameters');
            $sheet->setCellValue($instructionCol . '3', '2. Unit column shows the measurement unit for each parameter');
            $sheet->setCellValue($instructionCol . '4', '3. Fill in the Value column with your measurement (numeric only)');
            $sheet->setCellValue($instructionCol . '5', '4. Fill in Depth_m with sampling depth in meters (0 = surface)');
            $sheet->setCellValue($instructionCol . '6', '5. Optionally add any notes in the Remarks column');
            $sheet->setCellValue($instructionCol . '7', '6. Delete rows for parameters you did not measure');
            
            $sheet->getStyle($instructionCol . '1:' . $instructionCol . '7')->getFont()->setItalic(true)->setSize(9);
            $sheet->getStyle($instructionCol . '1')->getFont()->setBold(true);
        }

        // Generate filename
        $date = now()->format('Y-m-d');
        $filename = "LakeView_WQT_Import_{$date}.{$format}";

        // Save to temporary file
        $tempPath = storage_path('app/temp');
        if (!file_exists($tempPath)) {
            mkdir($tempPath, 0755, true);
        }

        $filePath = $tempPath . '/' . $filename;

        if ($format === 'xlsx') {
            $writer = new Xlsx($spreadsheet);
            $mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else {
            $writer = new CsvWriter($spreadsheet);
            $writer->setDelimiter(',');
            $writer->setEnclosure('"');
            $writer->setLineEnding("\r\n");
            $writer->setUseBOM(true);
            $mimeType = 'text/csv';
        }

        $writer->save($filePath);

        return [
            'path' => $filePath,
            'filename' => $filename,
            'mime_type' => $mimeType,
        ];
    }
}
