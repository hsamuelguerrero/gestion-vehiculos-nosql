# Justificación Técnica y Decisiones de Modelado NoSQL

## 1. Justificación de MongoDB
Se seleccionó MongoDB debido a su modelo documental flexible, el cual permite representar entidades automotrices con propiedades polimórficas (atributos variables de equipamiento, historiales de reparación y registros de pago fraccionados). Esto permite lecturas de alto rendimiento sin requerir múltiples operaciones JOIN a nivel transaccional y facilita la integración JSON directa con la API Express.

## 2. Decisiones de Embebido (Embedded Data)
* **Reparaciones en Vehículos:** Se modelaron como un array de subdocumentos dentro de cada vehículo porque pertenecen exclusivamente a su ciclo de vida y siempre se consultan al ver la ficha técnica del auto. Su crecimiento es acotado (1 a pocos).
* **Pagos en Ventas:** Se integran dentro del documento de la venta, permitiendo agregar pagos o abonos de forma atómica sin fragmentar la entidad de cobro.
* **Características y Direcciones:** Embebidos directamente en vehículos y clientes respectivamente para optimizar consultas directas en un solo documento.

## 3. Decisiones de Referenciación (Referenced Data)
* **Ventas hacia Vehículos y Clientes:** La colección `ventas` almacena `vehiculo_id` y `cliente_id` como referencias (`ObjectId`). Embeber las compras en el cliente causaría un crecimiento descontrolado del documento (antipatrón). Además, permite realizar análisis con pipelines de agregación (`$lookup`, `$unwind`) para cruzar costos, ingresos y ventas por marca sin duplicar datos.

## 4. Índices
* **`vin` único:** Garantiza unicidad del identificador estándar automotriz.
* **`dui` único:** Asegura integridad de identificación ciudadana.
* **`{ marca: 1, modelo: 1, anio: 1 }` y `estado`:** Optimizan el filtrado multicriterio del inventario disponible.
* **`fecha_ingreso` y `fecha`:** Aceleran los reportes de ventas y cálculo de rotación de inventario.