# Verificación de Sintaxis en PHP/Laravel

Siempre que agregues una nueva función o método a una clase en PHP/Laravel, asegúrate estrictamente de no romper la estructura de las llaves de cierre de la clase o de las funciones anteriores. 

**Regla estricta:** Verifica SIEMPRE la sintaxis con `php -l <archivo>` después de cualquier edición manual o con herramientas en archivos críticos de PHP (controladores, modelos, etc.) para evitar dejar el servidor inoperativo por errores de parseo (HTTP 500).
