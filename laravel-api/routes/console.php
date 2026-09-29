<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

Schedule::command('historial:guardar')->dailyAt('22:05');
Schedule::command('despacho:cambio-dia-automatico')->dailyAt('00:00')->timezone('America/Mexico_City');

