<?php
echo nl2br(shell_exec('tail -n 100 ../storage/logs/laravel.log'));
