<?php

namespace App\Services;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use Illuminate\Support\Facades\DB;

class BulkDatasetTemplateGenerator
{
    // Weather options matching WQTestWizard.jsx
    private const WEATHER_OPTIONS = [
        'sunny' => 'Sunny',
        'partly_cloudy' => 'Partly Cloudy',
        'cloudy' => 'Cloudy',
        'rainy' => 'Rainy',
        'stormy' => 'Stormy',
        'foggy' => 'Foggy',
        'windy' => 'Windy',
        'overcast' => 'Overcast',
    ];

    // Method options matching WQTestWizard.jsx
    private const METHOD_OPTIONS = [
        'manual' => 'Manual Grab Sampling',
        'automatic' => 'Automatic Sampling',
    ];

    /**
     * Generate bulk dataset import template
     *
     * @param int|null $lakeId
     * @param int|null $stationId
     * @param string $format ('xlsx' or 'csv')
     * @return \PhpOffice\PhpSpreadsheet\Spreadsheet
     */
    public function generate(?int $lakeId, ?int $stationId, string $format = 'xlsx')
    {
        $spreadsheet = new Spreadsheet();
        
        // Get lake and station info if IDs provided
        $lake = null;
        $station = null;
        
        if ($lakeId && $stationId) {
            $lake = DB::table('lakes')->where('id', $lakeId)->first();
            $station = DB::table('stations')->where('id', $stationId)->first();
            
            if (!$lake || !$station) {
                throw new \Exception('Invalid lake or station ID');
            }
        }

        // Get all available parameters
        $parameters = DB::table('parameters')
            ->select('id', 'name', 'code', 'unit')
            ->orderBy('name')
            ->get();

        // Create Instructions sheet
        $this->createInstructionsSheet($spreadsheet, $lake, $station);
        
        // Create Reference sheet (hidden) with parameter-unit mappings
        $this->createReferenceSheet($spreadsheet, $parameters);
        
        // Create Data sheet
        $this->createDataSheet($spreadsheet, $parameters);
        
        // Set active sheet to Data
        $spreadsheet->setActiveSheetIndex(2);
        
        return $spreadsheet;
    }

    /**
     * Create Instructions sheet
     */
    private function createInstructionsSheet(Spreadsheet $spreadsheet, $lake, $station)
    {
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Instructions');
        
        // Title
        $sheet->setCellValue('A1', 'LakeView Bulk Dataset Import Template');
        $sheet->getStyle('A1')->getFont()->setSize(16)->setBold(true);
        $sheet->getStyle('A1')->getFont()->getColor()->setRGB('2563EB');
        
        // Lake and Station Info
        if ($lake && $station) {
            $sheet->setCellValue('A3', 'Lake:');
            $sheet->setCellValue('B3', $lake->name);
            $sheet->setCellValue('A4', 'Station:');
            $sheet->setCellValue('B4', $station->name);
            $sheet->getStyle('A3:A4')->getFont()->setBold(true);
            
            // Hidden metadata for validation (white text to make invisible)
            $sheet->setCellValue('D3', $lake->id);
            $sheet->setCellValue('D4', $station->id);
            $sheet->setCellValue('C3', 'lake_id:');
            $sheet->setCellValue('C4', 'station_id:');
            $sheet->getStyle('C3:D4')->getFont()->setSize(1)->getColor()->setRGB('FFFFFF'); // White text
        } else {
            $sheet->setCellValue('A3', 'Type:');
            $sheet->setCellValue('B3', 'Generic Template (Please specify lake and station in your submission)');
            $sheet->getStyle('A3')->getFont()->setBold(true);
            $sheet->getStyle('B3')->getFont()->getColor()->setRGB('DC2626');
        }
        
        // Instructions
        $row = 6;
        $instructions = [
            'HOW TO USE THIS TEMPLATE:',
            '',
            'IMPORTANT: This template uses a row-based structure where each test begins with a header row followed by parameter rows.',
            '',
            'STRUCTURE OVERVIEW:',
            '  • Test Header Row: Contains test date, method, weather, sampler name, AND the first parameter',
            '  • Parameter Rows: Additional parameters for the same test (leave test metadata columns blank)',
            '  • New Test: Start a new test by filling the test_date column again',
            '',
            'COLUMNS (A-I):',
            '  A. test_date* - Date of sampling (required for test header row)',
            '  B. method* - Sampling method dropdown (required for test header row)',
            '  C. weather* - Weather condition dropdown (required for test header row)',
            '  D. sampler_name* - Name of person who collected sample (required for test header row)',
            '  E. parameter* - Parameter code/name (must match system parameters)',
            '  F. value* - Measured value (numeric)',
            '  G. unit - Unit of measurement (auto-filled; some parameters like pH have no unit)',
            '  H. depth_m - Depth in meters (default: 0 if blank)',
            '  I. remarks - Optional notes',
            '',
            'TEST HEADER ROW REQUIREMENTS:',
            '  When starting a new test (test_date is filled), you MUST provide:',
            '    • test_date (accepted formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, M/D/Y)',
            '    • method (select from dropdown)',
            '    • weather (select from dropdown)',
            '    • sampler_name (text)',
            '    • At least ONE parameter with value and unit',
            '',
            'PARAMETER ROWS (for same test):',
            '  Leave columns A-D blank, but fill:',
            '    • parameter (required)',
            '    • value (required)',
            '    • unit (auto-filled; leave empty for parameters without units like pH)',
            '    • depth_m (optional, defaults to 0)',
            '    • remarks (optional)',
            '',
            'DROPDOWN OPTIONS:',
            '  • Method: manual, automatic',
            '  • Weather: sunny, partly_cloudy, cloudy, rainy, stormy, foggy, windy, overcast',
            '  • Parameter: All available parameters (unit auto-fills when selected)',
            '  • Unit: Auto-filled based on selected parameter (can be changed if needed)',
            '',
            'EXAMPLE LAYOUT (see columns C-K on the right):',
            '  This creates TWO tests:',
            '    Test 1 (Dec 14): 3 parameters (pH, DO, BOD)',
            '    Test 2 (Dec 15): 2 parameters (pH, DO)',
            '',
            'IMPORTANT RULES:',
            '  • A row with test_date filled = Start of new test',
            '  • All rows below belong to that test until next test_date',
            '  • Each parameter must have: parameter name and value',
            '  • Unit is auto-filled (some parameters like pH have no unit)',
            '  • Depth defaults to 0 (surface) if left blank',
            '  • Use exact parameter names/codes from the system',
            '',
            'VALIDATION:',
            '  • Upload file to validate before importing',
            '  • System checks: required fields, date formats, parameter names, test grouping',
            '  • Fix any errors before final import',
        ];
        
        foreach ($instructions as $instruction) {
            $sheet->setCellValue('A' . $row, $instruction);
            if (strpos($instruction, 'HOW TO USE') === 0 || 
                strpos($instruction, 'STEP') === 0 || 
                strpos($instruction, 'GROUPING') === 0 ||
                strpos($instruction, 'REQUIRED') === 0 ||
                strpos($instruction, 'DROPDOWN') === 0 ||
                strpos($instruction, 'EXAMPLES') === 0 ||
                strpos($instruction, 'NOTES') === 0 ||
                strpos($instruction, 'VALIDATION') === 0) {
                $sheet->getStyle('A' . $row)->getFont()->setBold(true)->setSize(11);
                $sheet->getStyle('A' . $row)->getFont()->getColor()->setRGB('1F2937');
            } elseif (strpos($instruction, '  •') === 0 || strpos($instruction, '    Row') === 0) {
                $sheet->getStyle('A' . $row)->getFont()->setSize(10);
            }
            $row++;
        }
        
        // Auto-size column A
        $sheet->getColumnDimension('A')->setWidth(120);
        $sheet->getColumnDimension('B')->setWidth(30);
        
        // Add visual example in columns C-K
        $this->addExampleLayout($sheet);
        
        // Wrap text for all instruction cells
        $sheet->getStyle('A1:A' . $row)->getAlignment()->setWrapText(true);
    }

    /**
     * Add visual example layout to Instructions sheet
     */
    private function addExampleLayout($sheet)
    {
        // Find a good starting row (after the text instructions)
        $startRow = 6;
        
        // Example header - merge cells for title
        $sheet->setCellValue('C' . $startRow, 'VISUAL EXAMPLE:');
        $sheet->mergeCells('C' . $startRow . ':K' . $startRow);
        $sheet->getStyle('C' . $startRow)->getFont()->setBold(true)->setSize(12);
        $sheet->getStyle('C' . $startRow)->getFont()->getColor()->setRGB('2563EB');
        $sheet->getStyle('C' . $startRow)->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        
        $headerRow = $startRow + 1;
        
        // Column headers matching Data sheet
        $headers = [
            'C' => 'test_date*',
            'D' => 'method*',
            'E' => 'weather*',
            'F' => 'sampler_name*',
            'G' => 'parameter*',
            'H' => 'value*',
            'I' => 'unit*',
            'J' => 'depth_m',
            'K' => 'remarks',
        ];
        
        foreach ($headers as $col => $header) {
            $sheet->setCellValue($col . $headerRow, $header);
        }
        
        // Style header row
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '2563EB']
            ],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D1D5DB']]
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ]
        ];
        $sheet->getStyle('C' . $headerRow . ':K' . $headerRow)->applyFromArray($headerStyle);
        
        // Example data
        $exampleData = [
            // Test 1 - Header row with first parameter
            ['2025-12-14', 'manual', 'sunny', 'Juan Cruz', 'pH', '7.2', '', '0', 'Surface'],
            // Test 1 - Additional parameters
            ['', '', '', '', 'Dissolved Oxygen', '6.5', 'mg/L', '0', ''],
            ['', '', '', '', 'BOD', '3.1', 'mg/L', '0', ''],
            // Test 2 - Header row with first parameter
            ['2025-12-15', 'manual', 'cloudy', 'Maria Santos', 'pH', '7.0', '', '0', ''],
            // Test 2 - Additional parameter
            ['', '', '', '', 'Dissolved Oxygen', '5.8', 'mg/L', '0', ''],
        ];
        
        $dataRow = $headerRow + 1;
        $cols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
        
        foreach ($exampleData as $rowData) {
            foreach ($rowData as $colIndex => $value) {
                $sheet->setCellValue($cols[$colIndex] . $dataRow, $value);
            }
            
            // Style data rows
            $rowStyle = [
                'borders' => [
                    'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'E5E7EB']]
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_CENTER,
                ]
            ];
            $sheet->getStyle('C' . $dataRow . ':K' . $dataRow)->applyFromArray($rowStyle);
            
            // Highlight test header rows (rows with test_date filled)
            if (!empty($rowData[0])) {
                $sheet->getStyle('C' . $dataRow . ':K' . $dataRow)->getFill()
                    ->setFillType(Fill::FILL_SOLID)
                    ->getStartColor()->setRGB('DBEAFE'); // Light blue
                $sheet->getStyle('C' . $dataRow . ':F' . $dataRow)->getFont()->setBold(true);
            }
            
            $dataRow++;
        }
        
        // Add explanation below example
        $explainRow = $dataRow + 1;
        $sheet->setCellValue('C' . $explainRow, 'Blue rows = Test header rows (test_date filled)');
        $sheet->mergeCells('C' . $explainRow . ':K' . $explainRow);
        $sheet->getStyle('C' . $explainRow)->getFont()->setItalic(true)->setSize(9);
        $sheet->getStyle('C' . $explainRow)->getFont()->getColor()->setRGB('6B7280');
        
        $explainRow++;
        $sheet->setCellValue('C' . $explainRow, 'White rows = Parameter rows (test columns blank, only parameter data filled)');
        $sheet->mergeCells('C' . $explainRow . ':K' . $explainRow);
        $sheet->getStyle('C' . $explainRow)->getFont()->setItalic(true)->setSize(9);
        $sheet->getStyle('C' . $explainRow)->getFont()->getColor()->setRGB('6B7280');
        
        // Set column widths for example
        $sheet->getColumnDimension('C')->setWidth(14);
        $sheet->getColumnDimension('D')->setWidth(14);
        $sheet->getColumnDimension('E')->setWidth(14);
        $sheet->getColumnDimension('F')->setWidth(18);
        $sheet->getColumnDimension('G')->setWidth(20);
        $sheet->getColumnDimension('H')->setWidth(10);
        $sheet->getColumnDimension('I')->setWidth(10);
        $sheet->getColumnDimension('J')->setWidth(10);
        $sheet->getColumnDimension('K')->setWidth(15);
    }

    /**
     * Create hidden Reference sheet with parameter-unit mappings
     */
    private function createReferenceSheet(Spreadsheet $spreadsheet, $parameters)
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Reference');
        
        // Headers
        $sheet->setCellValue('A1', 'Parameter');
        $sheet->setCellValue('B1', 'Unit');
        $sheet->getStyle('A1:B1')->getFont()->setBold(true);
        
        // Add parameter-unit mappings
        $row = 2;
        foreach ($parameters as $parameter) {
            $sheet->setCellValue('A' . $row, $parameter->name);
            $sheet->setCellValue('B' . $row, $parameter->unit ?? '');
            $row++;
        }
        
        // Auto-size columns
        $sheet->getColumnDimension('A')->setWidth(30);
        $sheet->getColumnDimension('B')->setWidth(15);
        
        // Hide this sheet
        $sheet->setSheetState(\PhpOffice\PhpSpreadsheet\Worksheet\Worksheet::SHEETSTATE_HIDDEN);
    }

    /**
     * Create Data sheet with row-based structure
     */
    private function createDataSheet(Spreadsheet $spreadsheet, $parameters)
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Data');
        
        // Column headers - simple row-based structure
        $headers = [
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
        
        // Set headers
        foreach ($headers as $col => $header) {
            $sheet->setCellValue($col . '1', $header);
        }
        
        // Style header row
        $headerStyle = [
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '2563EB'] // Blue
            ],
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D1D5DB']]
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ]
        ];
        $sheet->getStyle('A1:I1')->applyFromArray($headerStyle);
        $sheet->getRowDimension(1)->setRowHeight(30);
        
        // Freeze header row
        $sheet->freezePane('A2');
        
        // Get all unique units for dropdown
        $allUnits = DB::table('parameters')
            ->whereNotNull('unit')
            ->distinct()
            ->pluck('unit')
            ->filter()
            ->sort()
            ->values()
            ->toArray();
        
        // Get all parameter names/codes for dropdown
        $parameterNames = $parameters->pluck('name')->sort()->values()->toArray();
        
        // Add data validation for Date column (A) - starting from row 2
        $dateValidation = $sheet->getCell('A2')->getDataValidation();
        $dateValidation->setType(DataValidation::TYPE_DATE);
        $dateValidation->setErrorStyle(DataValidation::STYLE_INFORMATION);
        $dateValidation->setAllowBlank(true);
        $dateValidation->setShowInputMessage(true);
        $dateValidation->setPrompt('Enter date (YYYY-MM-DD, DD/MM/YYYY, etc.). Fill only for new test header row.');
        $dateValidation->setPromptTitle('Test Date');
        // Copy validation down 1000 rows
        for ($r = 3; $r <= 1000; $r++) {
            $sheet->getCell('A' . $r)->setDataValidation(clone $dateValidation);
        }
        
        // Add data validation for Method column (B) - Dropdown
        $methodList = '"' . implode(',', array_keys(self::METHOD_OPTIONS)) . '"';
        $methodValidation = $sheet->getCell('B2')->getDataValidation();
        $methodValidation->setType(DataValidation::TYPE_LIST);
        $methodValidation->setErrorStyle(DataValidation::STYLE_INFORMATION);
        $methodValidation->setAllowBlank(true);
        $methodValidation->setShowDropDown(true);
        $methodValidation->setShowInputMessage(true);
        $methodValidation->setFormula1($methodList);
        $methodValidation->setPrompt('Select method. Required for test header row.');
        $methodValidation->setPromptTitle('Method');
        for ($r = 3; $r <= 1000; $r++) {
            $sheet->getCell('B' . $r)->setDataValidation(clone $methodValidation);
        }
        
        // Add data validation for Weather column (C) - Dropdown
        $weatherList = '"' . implode(',', array_keys(self::WEATHER_OPTIONS)) . '"';
        $weatherValidation = $sheet->getCell('C2')->getDataValidation();
        $weatherValidation->setType(DataValidation::TYPE_LIST);
        $weatherValidation->setErrorStyle(DataValidation::STYLE_INFORMATION);
        $weatherValidation->setAllowBlank(true);
        $weatherValidation->setShowDropDown(true);
        $weatherValidation->setShowInputMessage(true);
        $weatherValidation->setFormula1($weatherList);
        $weatherValidation->setPrompt('Select weather. Required for test header row.');
        $weatherValidation->setPromptTitle('Weather');
        for ($r = 3; $r <= 1000; $r++) {
            $sheet->getCell('C' . $r)->setDataValidation(clone $weatherValidation);
        }
        
        // Add data validation for Parameter column (E) - Dropdown with all parameters
        if (!empty($parameterNames)) {
            $parameterList = '"' . implode(',', $parameterNames) . '"';
            $paramValidation = $sheet->getCell('E2')->getDataValidation();
            $paramValidation->setType(DataValidation::TYPE_LIST);
            $paramValidation->setErrorStyle(DataValidation::STYLE_INFORMATION);
            $paramValidation->setAllowBlank(true);
            $paramValidation->setShowDropDown(true);
            $paramValidation->setShowInputMessage(true);
            $paramValidation->setFormula1($parameterList);
            $paramValidation->setPrompt('Select parameter from available options');
            $paramValidation->setPromptTitle('Parameter');
            for ($r = 3; $r <= 1000; $r++) {
                $sheet->getCell('E' . $r)->setDataValidation(clone $paramValidation);
            }
        }
        
        // Add VLOOKUP formula to auto-populate unit based on parameter selection
        // Formula: =IF(E2="","",IFERROR(VLOOKUP(E2,Reference!$A$2:$B$1000,2,FALSE),""))
        for ($r = 2; $r <= 1000; $r++) {
            $sheet->setCellValue('G' . $r, '=IF(E' . $r . '="","",IFERROR(VLOOKUP(E' . $r . ',Reference!$A$2:$B$1000,2,FALSE),""))');
        }
        
        // Unlock all cells first (default is locked when protection is enabled)
        $sheet->getStyle('A1:I1000')->getProtection()->setLocked(\PhpOffice\PhpSpreadsheet\Style\Protection::PROTECTION_UNPROTECTED);
        
        // Lock only the Unit column (G) to prevent editing
        $sheet->getStyle('G2:G1000')->getProtection()->setLocked(\PhpOffice\PhpSpreadsheet\Style\Protection::PROTECTION_PROTECTED);
        
        // Protect the sheet but allow certain actions
        $protection = $sheet->getProtection();
        $protection->setSheet(true);
        $protection->setPassword('lakeviewph');
        $protection->setSort(true); // Allow sorting
        $protection->setInsertRows(true); // Allow inserting rows
        $protection->setDeleteRows(true); // Allow deleting rows
        $protection->setFormatCells(true); // Allow formatting
        $protection->setInsertColumns(false); // Prevent inserting columns
        $protection->setDeleteColumns(false); // Prevent deleting columns
        
        // Set column widths
        $sheet->getColumnDimension('A')->setWidth(14); // test_date
        $sheet->getColumnDimension('B')->setWidth(22); // method
        $sheet->getColumnDimension('C')->setWidth(18); // weather
        $sheet->getColumnDimension('D')->setWidth(25); // sampler_name
        $sheet->getColumnDimension('E')->setWidth(20); // parameter
        $sheet->getColumnDimension('F')->setWidth(12); // value
        $sheet->getColumnDimension('G')->setWidth(12); // unit
        $sheet->getColumnDimension('H')->setWidth(12); // depth_m
        $sheet->getColumnDimension('I')->setWidth(30); // remarks
    }

    /**
     * Get filename for download
     */
    public function getFilename(?int $lakeId, ?int $stationId, string $format = 'xlsx'): string
    {
        if (!$lakeId || !$stationId) {
            $date = date('Y-m-d');
            return "LakeView_Dataset_Template_{$date}.{$format}";
        }
        
        $lake = DB::table('lakes')->where('id', $lakeId)->first();
        $station = DB::table('stations')->where('id', $stationId)->first();
        
        $lakeName = $lake ? str_replace(' ', '_', $lake->name) : 'Lake';
        $stationName = $station ? str_replace(' ', '_', $station->name) : 'Station';
        $date = date('Y-m-d');
        
        return "LakeView_Dataset_{$lakeName}_{$stationName}_{$date}.{$format}";
    }
}
