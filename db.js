const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS objetos (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        categoria VARCHAR(50) NOT NULL,
        codigo VARCHAR(50) UNIQUE NOT NULL,
        descripcion TEXT,
        cantidad_total INT NOT NULL CHECK(cantidad_total >= 0),
        cantidad_disponible INT NOT NULL CHECK(cantidad_disponible >= 0),
        estado VARCHAR(20) DEFAULT 'Disponible',
        ubicacion VARCHAR(100) NOT NULL,
        observaciones TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS prestamos (
        id SERIAL PRIMARY KEY,
        estudiante VARCHAR(100) NOT NULL,
        documento VARCHAR(50) NOT NULL,
        curso VARCHAR(50) NOT NULL,
        docente_responsable VARCHAR(100),
        objeto_id INT REFERENCES objetos(id),
        cantidad INT NOT NULL DEFAULT 1 CHECK(cantidad > 0),
        fecha_prestamo DATE DEFAULT CURRENT_DATE,
        hora_prestamo TIME DEFAULT CURRENT_TIME,
        fecha_devolucion DATE,
        hora_devolucion TIME,
        estado VARCHAR(20) DEFAULT 'Prestado',
        observaciones TEXT
      );
    `);
    console.log('✅ Base de datos Postgres sincronizada.');
  } catch (err) {
    console.error('Error al crear tablas:', err);
  } finally {
    client.release();
  }
};

initDb().catch(console.error);

module.exports = pool;