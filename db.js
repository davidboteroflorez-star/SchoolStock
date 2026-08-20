// db.js
const Database = require('better-sqlite3');
const db = new Database('database.db');

// Habilitar claves foráneas
db.pragma('foreign_keys = ON');

// Tabla Objetos
db.exec(`
  CREATE TABLE IF NOT EXISTS objetos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    cantidad_total INTEGER NOT NULL CHECK(cantidad_total >= 0),
    cantidad_disponible INTEGER NOT NULL CHECK(cantidad_disponible >= 0),
    estado TEXT DEFAULT 'Disponible',
    ubicacion TEXT NOT NULL,
    observaciones TEXT
  );
`);

// Tabla Préstamos (Fechas/Horas configuradas con la hora local del servidor)
db.exec(`
  CREATE TABLE IF NOT EXISTS prestamos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    estudiante TEXT NOT NULL,
    documento TEXT NOT NULL,
    curso TEXT NOT NULL,
    docente_responsable TEXT,
    objeto_id INTEGER NOT NULL,
    cantidad INTEGER NOT NULL DEFAULT 1 CHECK(cantidad > 0),
    fecha_prestamo DATE DEFAULT (date('now', 'localtime')),
    hora_prestamo TIME DEFAULT (time('now', 'localtime')),
    fecha_devolucion DATE,
    hora_devolucion TIME,
    estado TEXT DEFAULT 'Prestado',
    observaciones TEXT,
    FOREIGN KEY (objeto_id) REFERENCES objetos(id)
  );
`);

console.log('✅ Base de datos configurada correctamente en hora local.');

module.exports = db;