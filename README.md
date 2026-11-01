# Sistema de Gestión de Inventario y Venta de Vehículos Usados

Proyecto final de la materia **Bases de Datos II (No Relacionales)** Universidad Evangélica de El Salvador.

## Requisitos previos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) en ejecución.
- [Node.js](https://nodejs.org/) (versión 18 o superior).

## Puesta en marcha

### 1. Clonar el repositorio e instalar dependencias
```bash
git clone [https://github.com/hsamuelguerrero/gestion-vehiculos-nosql.git](https://github.com/hsamuelguerrero/gestion-vehiculos-nosql.git)
cd gestion-vehiculos-nosql
npm install

### 2. Levantar el motor de la base de datos
```bash
docker compose up -d

### 3. Cargar los datos de prueba 
```bash
cmd /c "docker exec -i mongodb_concesionario mongosh < .\scripts\mongo\02_seed_data.js"

### 4. Iniciar el servidor
```bash
npm start

