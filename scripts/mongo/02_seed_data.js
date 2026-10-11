// scripts/mongo/02_seed_data.js
const db = db.getSiblingDB('concesionario_db');

const marcas = ["Toyota", "Nissan", "Honda", "Hyundai", "Kia", "Mazda", "Chevrolet", "Ford"];
const modelosPorMarca = {
  Toyota: ["Corolla", "Yaris", "RAV4", "Hilux"],
  Nissan: ["Versa", "Sentra", "Rogue", "Frontier"],
  Honda: ["Civic", "CR-V", "Fit", "Accord"],
  Hyundai: ["Elantra", "Tucson", "Accent", "Santa Fe"],
  Kia: ["Forte", "Sportage", "Rio", "Sorento"],
  Mazda: ["Mazda 3", "CX-5", "Mazda 2", "CX-30"],
  Chevrolet: ["Cruze", "Tracker", "Colorado", "Spark"],
  Ford: ["Focus", "Escape", "Ranger", "Explorer"]
};
const colores = ["Blanco", "Negro", "Gris", "Plateado", "Azul", "Rojo"];
const transmisiones = ["manual", "automatica"];
const combustibles = ["gasolina", "diesel", "hibrido"];

// 1. Cargar 100 Vehículos
const vehiculosDocs = [];
for (let i = 1; i <= 100; i++) {
  const marca = marcas[i % marcas.length];
  const modelos = modelosPorMarca[marca];
  const modelo = modelos[i % modelos.length];
  // VIN válido de exactamente 17 caracteres (letras y números permitidos)
  const sufijo = String(i).padStart(6, '0');
  const vinValido = `1HGCR2F83HA${sufijo}`;

  const precioVenta = Double(7500.0 + (i * 120));
  const costoCompra = Double((7500.0 + (i * 120)) * 0.78);

  vehiculosDocs.push({
    vin: vinValido,
    marca: marca,
    modelo: modelo,
    anio: NumberInt(2012 + (i % 12)),
    precio: precioVenta,
    costo_compra: costoCompra,
    kilometraje: NumberInt(35000 + (i * 1200)),
    estado: i <= 50 ? "vendido" : (i <= 80 ? "disponible" : "reservado"),
    fecha_ingreso: new Date(2025, (i % 10), (i % 25) + 1),
    caracteristicas: {
      transmision: transmisiones[i % transmisiones.length],
      combustible: combustibles[i % combustibles.length],
      color: colores[i % colores.length]
    },
    reparaciones: [
      {
        fecha: new Date(2025, 10, (i % 25) + 1),
        descripcion: "Mantenimiento preventivo general y cambio de frenos",
        costo: Double(85.50)
      }
    ]
  });
}
const resVehiculos = db.vehiculos.insertMany(vehiculosDocs);
const vehiculosIds = Object.values(resVehiculos.insertedIds);

// 2. Cargar 60 Clientes
const nombres = ["Carlos", "Ana", "Luis", "Elena", "Roberto", "María", "David", "Claudia", "Jorge", "Sofía"];
const apellidos = ["Rodríguez", "Hernández", "García", "Martínez", "López", "Pérez", "Flores", "Rivas"];
const deptos = ["San Salvador", "La Libertad", "Santa Ana", "San Miguel", "Sonsonate"];

const clientesDocs = [];
for (let i = 1; i <= 60; i++) {
  const nombreComp = `${nombres[i % nombres.length]} ${apellidos[i % apellidos.length]}`;
  const correlativoDui = String(10000000 + i); // 8 dígitos exactos
  const digitoVerificador = String(i % 9);

  clientesDocs.push({
    nombre: nombreComp,
    dui: `${correlativoDui}-${digitoVerificador}`,
    telefono: `7${String(1000000 + i).substring(0, 7)}`,
    email: `cliente${i}@correo.com`,
    direccion: {
      departamento: deptos[i % deptos.length],
      municipio: "Central",
      detalle: `Avenida Principal Polígono ${i}`
    }
  });
}
const resClientes = db.clientes.insertMany(clientesDocs);
const clientesIds = Object.values(resClientes.insertedIds);

// 3. Cargar 50 Ventas
const metodos = ["contado", "transferencia", "financiamiento"];
const ventasDocs = [];
for (let i = 0; i < 50; i++) {
  const monto = vehiculosDocs[i].precio;
  const metodo = metodos[i % metodos.length];

  ventasDocs.push({
    numero_factura: `FAC-2026-${String(1001 + i)}`,
    fecha: new Date(2026, (i % 9), (i % 27) + 1),
    vehiculo_id: vehiculosIds[i],
    cliente_id: clientesIds[i % clientesIds.length],
    monto_total: monto,
    metodo_pago: metodo,
    pagos: [
      {
        fecha: new Date(2026, (i % 9), (i % 27) + 1),
        monto: metodo === "financiamiento" ? Double(Number(monto) * 0.30) : monto,
        metodo: metodo
      }
    ],
    observaciones: "Venta finalizada y registrada con revisión mecánica completada."
  });
}
db.ventas.insertMany(ventasDocs);
print("Datos cargados con éxito: 100 vehículos, 60 clientes y 50 ventas.");