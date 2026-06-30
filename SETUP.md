# 🚀 Sistema de Despacho - Setup Completado

## Estado del Proyecto

### ✅ Servicios en ejecución

| Servicio | Puerto | Status | URL |
|----------|--------|--------|-----|
| **Frontend (React)** | 5173 | ✅ Ejecutando | http://localhost:5173 |
| **Laravel API** | 8000 | ✅ Ejecutando | http://localhost:8000 |
| **Backend Node.js** | 4000 | ✅ Ejecutando | http://localhost:4000 |

### 📦 Dependencias

- ✅ Frontend: `npm install` completado
- ✅ Backend: `npm install` completado  
- ✅ Laravel: `composer install` completado
- ✅ Base de datos: Migraciones ejecutadas (SQLite)

### 🗄️ Base de Datos

- **Driver:** SQLite
- **Location:** `laravel-api/database/database.sqlite`
- **Migraciones ejecutadas:** 9 tablas creadas
  - Users
  - Cache
  - Jobs  
  - Personal Access Tokens
  - Unidades
  - Información Operativa
  - Checklists

> **Nota:** Actualmente usando SQLite. Para cambiar a PostgreSQL (Neon), edita `.env` en `laravel-api/` y descomenta las líneas de PostgreSQL después de resolver el driver PHP.

### 🚀 Cómo levantar los servicios

**Opción 1: Automático (Recomendado)**
```bash
cd /home/angepau/GitHub/Sistema_de_Despacho
bash run-dev.sh
```

**Opción 2: Manual (3 terminales separadas)**

Terminal 1:
```bash
cd /home/angepau/GitHub/Sistema_de_Despacho/frontend && npm run dev
```

Terminal 2:
```bash
cd /home/angepau/GitHub/Sistema_de_Despacho/laravel-api && php artisan serve
```

Terminal 3 (Opcional):
```bash
cd /home/angepau/GitHub/Sistema_de_Despacho/backend && npm run dev
```

### 📋 Logs

Los logs de cada servicio se guardan en:
```
/home/angepau/GitHub/Sistema_de_Despacho/logs/
├── Frontend.log
├── Laravel API.log
└── Backend Node.log
```

Ver logs en tiempo real:
```bash
tail -f /home/angepau/GitHub/Sistema_de_Despacho/logs/Frontend.log
tail -f /home/angepau/GitHub/Sistema_de_Despacho/logs/Laravel\ API.log
tail -f /home/angepau/GitHub/Sistema_de_Despacho/logs/Backend\ Node.log
```

### 🔧 Configuración

**Frontend** (`frontend/src/config/api.js`):
- Detecta automáticamente si estás en localhost o red local
- API base: http://localhost:8000

**Laravel** (`laravel-api/.env`):
- Database: SQLite (temporalmente)
- APP_PORT: 8000
- APP_DEBUG: true

**Backend** (`backend/src/server.js`):
- Puerto: 4000
- Usa Express + CORS

### 🐛 Próximos pasos

1. **Configurar PostgreSQL (Neon)** - Cuando el driver PHP esté completamente funcional
2. **Agregar seeders** - Datos de prueba en la BD
3. **Implementar API endpoints** - Controllers en Laravel
4. **Conectar frontend con API** - Servicios React

---

✨ **¡Proyecto listo para desarrollo!**
