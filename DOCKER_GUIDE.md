# 🐳 Guía de Dockerización y Despliegue en Rocky Linux

## 🚀 Inicio Rápido (Un Solo Comando en Servidor)

Para desplegar todo el proyecto en tu servidor Rocky Linux (o cualquier distribución Linux), clona el repositorio y ejecuta:

```bash
docker compose up -d --build
```

---

## 🛠️ Despliegue Automático con Script (`deploy-rocky.sh`)

Si es un servidor nuevo de Rocky Linux y aún no tiene Docker/Docker Compose instalado, puedes ejecutar el script automatizado:

```bash
chmod +x deploy-rocky.sh
./deploy-rocky.sh
```

El script se encargará de:
1. Instalar Docker y Docker Compose mediante `dnf` si no existen.
2. Iniciar y habilitar el servicio Docker en el arranque de Rocky Linux (`systemctl enable --now docker`).
3. Copiar las variables de entorno para producción.
4. Compilar y levantar la base de datos PostgreSQL, la API Laravel, el microservicio Node.js y el servidor Nginx con la app React.

---

## 🧩 Servicios Incluidos en el `docker-compose.yml`

| Servicio | Contenedor | Puerto Expuesto | Descripción |
|----------|------------|-----------------|-------------|
| **Frontend React** | `despacho-frontend` | `80` (HTTP) / `5173` | React SPA empaquetado y servido por Nginx optimizado con Gzip. |
| **API Laravel** | `despacho-laravel` | `8000` | Backend principal en PHP 8.3 con controladores PostgreSQL y migraciones automáticas. |
| **Node.js Backend** | `despacho-node-backend` | `4000` | Microservicio auxiliar de soporte. |
| **Base de Datos** | `despacho-db` | `5432` | PostgreSQL 16 con volumen persistente `postgres_data`. |

---

## ⚙️ Comandos Útiles de Administración

### Ver estado de los contenedores
```bash
docker compose ps
```

### Ver logs en tiempo real de todos los servicios
```bash
docker compose logs -f
```

### Ver logs de un servicio específico
```bash
# Logs de la API Laravel
docker compose logs -f laravel-api

# Logs del servidor Nginx (Frontend)
docker compose logs -f frontend
```

### Detener los servicios
```bash
docker compose down
```

### Reiniciar los servicios tras hacer cambios de código
```bash
docker compose up -d --build
```

---

## 🔒 Firewall en Rocky Linux (`firewalld`)

Si el servidor tiene el cortafuegos `firewalld` activo en Rocky Linux, asegúrate de permitir el tráfico en los puertos correspondientes:

```bash
# Permitir HTTP (puerto 80)
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --permanent --add-port=4000/tcp
sudo firewall-cmd --reload
```
