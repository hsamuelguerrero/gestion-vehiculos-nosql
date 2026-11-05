# Sistema de Gestión de Inventario y Venta de Vehículos Usados

Proyecto final de **Bases de Datos II (No Relacionales)** – Universidad Evangélica de El Salvador.
Catedrático: Mg. Josué A. Guinea Henríquez · **Grupo 6**

| Integrante | Carnet | Responsabilidad |
|---|---|---|
| Hector Samuel Guerrero Bonilla | 2025010370 | Base de datos, validaciones, índices, seed, diseño |
| Hector David Doñan Pérez | 2025011294 | API de vehículos y clientes, colección Postman |
| Dennys Fernando Esperanza Huete | 2021010442 | API de ventas y reportes |

**Stack:** MongoDB 6.0 (Docker) · Node.js 18+ · Express 5 · driver oficial `mongodb`.

## Puesta en marcha

Requisitos: Docker Desktop en ejecución y Node.js 18 o superior.

```bash
git clone https://github.com/hsamuelguerrero/gestion-vehiculos-nosql.git
cd gestion-vehiculos-nosql
npm install
cp .env.example .env        # en Windows: copy .env.example .env
docker compose up -d
npm start
```

La API queda en `http://localhost:3000` (`GET /health` para comprobar).

Al levantar el contenedor por primera vez, MongoDB ejecuta automáticamente los scripts de `scripts/mongo/`:

1. `01_init_collections.js`: crea las colecciones con validación `$jsonSchema` y los índices.
2. `02_seed_data.js`: carga 100 vehículos, 60 clientes y 50 ventas.

Para reiniciar la base desde cero (borra todos los datos y vuelve a correr los scripts):

```bash
docker compose down -v
docker compose up -d
```

## Pruebas

Importar `docs/postman_collection.json` en Postman y usar **Run collection**, o desde la terminal:

```bash
npx newman run docs/postman_collection.json
```

La colección guarda los ids en variables y limpia los datos que crea, así que se puede correr varias veces.

## Endpoints

Listados: `{ data, page, limit, total }` con `page` y `limit` (máx. 100). Errores: `{ "error": "mensaje" }` con 400, 404 o 409.

### Vehículos
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/vehiculos` | Registrar vehículo |
| GET | `/vehiculos` | Listar con filtros: `marca`, `modelo`, `estado` (ej. `disponible,reservado`), `anio_min`, `anio_max`, `precio_min`, `precio_max`, `km_max`, `transmision`, `combustible`, `color`, `con_reparaciones`, `reparacion_costo_min`; orden con `sort` (`precio`, `anio`, `kilometraje`, `fecha_ingreso`, `marca`, `modelo`) y `order=desc` |
| GET | `/vehiculos/:id` | Ver detalle |
| PUT | `/vehiculos/:id` | Actualizar (no permite marcar como vendido) |
| POST | `/vehiculos/:id/reparaciones` | Agregar reparación al historial |
| DELETE | `/vehiculos/:id` | Eliminar (409 si tiene venta) |

### Clientes
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/clientes` | Registrar cliente |
| GET | `/clientes` | Listar con filtros: `nombre` (parcial), `dui`, `email`, `departamento`, `municipio`; `sort` (`nombre`, `dui`, `departamento`) |
| GET | `/clientes/:id` | Ver detalle |
| PUT | `/clientes/:id` | Actualizar |
| DELETE | `/clientes/:id` | Eliminar (409 si tiene compras) |

### Ventas
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/ventas` | Registrar venta: valida cliente, marca el vehículo como vendido de forma atómica (409 si no está disponible) |
| GET | `/ventas` | Listar con filtros: `metodo_pago`, `cliente_id`, `vehiculo_id`, `fechaInicio`, `fechaFin` |
| GET | `/ventas/:id` | Detalle con vehículo y cliente (`$lookup`), total pagado y saldo pendiente |
| POST | `/ventas/:id/pagos` | Agregar pago (400 si excede el saldo) |
| DELETE | `/ventas/:id` | Anular venta y devolver el vehículo a disponible |

### Reportes (pipelines de agregación)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/reportes/ventas-mensuales` | Cantidad y monto vendido por mes (`$group`, `$year`, `$month`) |
| GET | `/reportes/ganancia-por-marca` | Ingresos, costo (compra + reparaciones) y ganancia por marca (`$lookup`, `$unwind`, `$group`) |
| GET | `/reportes/inventario` | Disponibles, valor y días promedio en inventario por marca (`$dateDiff`) |

## Documentación

- [Diagrama del modelo de datos](docs/diagrama_modelo.md)
- [Justificación de MongoDB y decisiones de diseño](docs/decisiones_diseno.md)
- [Colección Postman](docs/postman_collection.json)

## Estructura

```
├── docker-compose.yml
├── scripts/mongo/          # 01 colecciones + índices, 02 datos de prueba
├── src/
│   ├── app.js              # servidor y manejo central de errores
│   ├── db.js               # conexión a MongoDB
│   ├── routes/             # vehiculos, clientes, ventas, reportes
│   ├── controllers/
│   └── utils/http.js       # errores HTTP, paginación, validación de ids
└── docs/
```
