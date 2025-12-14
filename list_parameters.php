<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$parameters = App\Models\Parameter::select('code', 'name', 'unit')->get();

echo "Available Parameters in Database:\n";
echo "==================================\n\n";

foreach ($parameters as $p) {
    echo sprintf("%-15s | %-30s | %s\n", $p->code, $p->name, $p->unit);
}

echo "\nTotal: " . $parameters->count() . " parameters\n";
