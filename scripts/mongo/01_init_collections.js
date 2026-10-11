const db = db.getSiblingDB('concesionario_db');

// 1. Colección VEHÍCULOS
db.createCollection("vehiculos", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["vin", "marca", "modelo", "anio", "precio", "costo_compra", "kilometraje", "estado", "fecha_ingreso"],
      properties: {
        vin: { bsonType: "string", pattern: "^[A-HJ-NPR-Z0-9]{17}$", description: "VIN estándar de 17 caracteres requerido" },
        marca: { bsonType: "string" },
        modelo: { bsonType: "string" },
        anio: { bsonType: "int", minimum: 1990, maximum: 2027 },
        precio: { bsonType: ["double", "int", "decimal"], minimum: 0 },
        costo_compra: { bsonType: ["double", "int", "decimal"], minimum: 0 },
        kilometraje: { bsonType: "int", minimum: 0 },
        estado: { enum: ["disponible", "reservado", "vendido"] },
        fecha_ingreso: { bsonType: "date" },
        caracteristicas: {
          bsonType: "object",
          properties: {
            transmision: { enum: ["manual", "automatica"] },
            combustible: { enum: ["gasolina", "diesel", "hibrido", "electrico"] },
            color: { bsonType: "string" }
          }
        },
        reparaciones: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["fecha", "descripcion", "costo"],
            properties: {
              fecha: { bsonType: "date" },
              descripcion: { bsonType: "string" },
              costo: { bsonType: ["double", "int", "decimal"], minimum: 0 }
            }
          }
        }
      }
    }
  }
});

// Índices requeridos
db.vehiculos.createIndex({ vin: 1 }, { unique: true });
db.vehiculos.createIndex({ marca: 1, modelo: 1, anio: 1 });
db.vehiculos.createIndex({ estado: 1 });
db.vehiculos.createIndex({ fecha_ingreso: 1 });

// 2. Colección CLIENTES
db.createCollection("clientes", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["nombre", "dui", "telefono", "email"],
      properties: {
        nombre: { bsonType: "string" },
        dui: { bsonType: "string", pattern: "^[0-9]{8}-[0-9]{1}$", description: "Formato DUI: ########-#" },
        telefono: { bsonType: "string" },
        email: { bsonType: "string", pattern: "^.+@.+\\..+$" },
        direccion: {
          bsonType: "object",
          properties: {
            departamento: { bsonType: "string" },
            municipio: { bsonType: "string" },
            detalle: { bsonType: "string" }
          }
        }
      }
    }
  }
});

db.clientes.createIndex({ dui: 1 }, { unique: true });
db.clientes.createIndex({ "direccion.departamento": 1 });

// 3. Colección VENTAS
db.createCollection("ventas", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["numero_factura", "fecha", "vehiculo_id", "cliente_id", "monto_total", "metodo_pago"],
      properties: {
        numero_factura: { bsonType: "string" },
        fecha: { bsonType: "date" },
        vehiculo_id: { bsonType: "objectId" },
        cliente_id: { bsonType: "objectId" },
        monto_total: { bsonType: ["double", "int", "decimal"], minimum: 0 },
        metodo_pago: { enum: ["contado", "transferencia", "financiamiento"] },
        pagos: {
          bsonType: "array",
          items: {
            bsonType: "object",
            required: ["fecha", "monto", "metodo"],
            properties: {
              fecha: { bsonType: "date" },
              monto: { bsonType: ["double", "int", "decimal"], minimum: 0 },
              metodo: { bsonType: "string" }
            }
          }
        },
        observaciones: { bsonType: "string" }
      }
    }
  }
});

db.ventas.createIndex({ numero_factura: 1 }, { unique: true });
db.ventas.createIndex({ fecha: -1 });