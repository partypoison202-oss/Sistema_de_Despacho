const fs = require('fs');
const apiPath = 'C:/Users/Jose M/Documents/stm-proyecto/laravel-api/routes/api.php';
let apiCode = fs.readFileSync(apiPath, 'utf8');
apiCode = apiCode.replace(/use App\\Http\\Controllers\\API\\AmonestacionController;\r?\n/, '');
apiCode = apiCode.replace(/    Route::get\('\/amonestaciones\/check\/\{placa\}', \[AmonestacionController::class, 'checkPlaca'\]\);\r?\n/, '');
apiCode = apiCode.replace(/    Route::get\('\/amonestaciones', \[AmonestacionController::class, 'index'\]\);\r?\n/, '');
apiCode = apiCode.replace(/    Route::post\('\/amonestaciones', \[AmonestacionController::class, 'store'\]\);\r?\n/, '');

// Now we need to add the check route for infracciones
const infraccionRouteCheck = "    Route::get('/infracciones/check/{placa}', [InfraccionController::class, 'checkPlaca']);\n    Route::get('/infracciones', [InfraccionController::class, 'index']);";
apiCode = apiCode.replace("    Route::get('/infracciones', [InfraccionController::class, 'index']);", infraccionRouteCheck);

fs.writeFileSync(apiPath, apiCode);
console.log('Done');
