<?php
require __DIR__.'/../vendor/autoload.php';
$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$ref = new ReflectionClass(App\Http\Controllers\API\DespachoController::class);
echo "Methods:\n";
foreach ($ref->getMethods() as $method) {
    if ($method->class === App\Http\Controllers\API\DespachoController::class) {
        echo "- " . $method->getName() . " (line " . $method->getStartLine() . " to " . $method->getEndLine() . ")\n";
    }
}
