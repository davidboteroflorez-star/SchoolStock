const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();

// Middleware para procesar JSON en el cuerpo de las peticiones
app.use(express.json());

// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de la base de datos PostgreSQL (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware para verificar clave de administrador en rutas protegidas
function verificarAdmin(req, res, next) {
  const passwordHeader = req.headers['x-admin-password'];
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  if (passwordHeader && passwordHeader === adminPassword) {
    next();
  } else {
    res.status(401).json({ error: 'Contraseña de administrador incorrecta o no proporcionada.' });
  }
}

// -------------------------------------------------------------
// RUTAS DE LA API (/api)
// -------------------------------------------------------------

// 1. Obtener todos los objetos del inventario
app.get('/api/objetos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM objetos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener objetos:", err);
    res.status(500).json({ error: 'Error al consultar la base de datos.' });
  }
});

// 2. Crear un nuevo objeto (Protegido por Clave)
app.post('/api/objetos', verificarAdmin, async (req, res) => {
  const { codigo, nombre, categoria, cantidad_total, ubicacion } = req.body;
  const cantidad = parseInt(cantidad_total) || 1;

  try {
    const result = await pool.query(
      `INSERT INTO objetos (codigo, nombre, categoria, cantidad_total, cantidad_disponible, ubicacion)
       VALUES ($1, $2, $3, $4, $4, $5) RETURNING *`,
      [codigo, nombre, categoria, cantidad, ubicacion]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error al guardar objeto:", err);
    res.status(400).json({ error: 'Error al registrar el objeto en la base de datos.' });
  }
});

// 3. Eliminar un objeto (Protegido por Clave)
app.delete('/api/objetos/:id', verificarAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM objetos WHERE id = $1', [id]);
    res.json({ message: 'Objeto eliminado correctamente.' });
  } catch (err) {
    console.error("Error al eliminar objeto:", err);
    res.status(500).json({ error: 'Error al eliminar el objeto.' });
  }
});

// 4. Obtener todos los préstamos
app.get('/api/prestamos', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, o.nombre AS objeto_nombre 
      FROM prestamos p 
      LEFT JOIN objetos o ON p.objeto_id = o.id 
      ORDER BY p.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error al obtener préstamos:", err);
    res.status(500).json({ error: 'Error al obtener préstamos.' });
  }
});

// 5. Registrar un nuevo préstamo
app.post('/api/prestamos', async (req, res) => {
  const { objeto_id, solicitante, rol, fecha_prestamo } = req.body;

  try {
    // Verificar disponibilidad
    const objCheck = await pool.query('SELECT cantidad_disponible FROM objetos WHERE id = $1', [objeto_id]);
    if (objCheck.rows.length === 0 || objCheck.rows[0].cantidad_disponible <= 0) {
      return res.status(400).json({ error: 'El objeto no está disponible para préstamo.' });
    }

    // Insertar préstamo
    await pool.query(
      `INSERT INTO prestamos (objeto_id, solicitante, rol, fecha_prestamo, estado)
       VALUES ($1, $2, $3, $4, 'Activo')`,
      [objeto_id, solicitante, rol, fecha_prestamo]
    );

    // Reducir cantidad disponible
    await pool.query(
      'UPDATE objetos SET cantidad_disponible = cantidad_disponible - 1 WHERE id = $1',
      [objeto_id]
    );

    res.status(201).json({ message: 'Préstamo registrado exitosamente.' });
  } catch (err) {
    console.error("Error al registrar préstamo:", err);
    res.status(500).json({ error: 'Error al procesar el préstamo.' });
  }
});

// 6. Registrar devolución de un objeto
app.put('/api/prestamos/:id/devolucion', async (req, res) => {
  const { id } = req.params;
  const fechaHoy = new Date().toISOString().split('T')[0];

  try {
    const prestamoRes = await pool.query('SELECT * FROM prestamos WHERE id = $1', [id]);
    if (prestamoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Préstamo no encontrado.' });
    }

    const prestamo = prestamoRes.rows[0];
    if (prestamo.estado === 'Devuelto') {
      return res.status(400).json({ error: 'El préstamo ya fue devuelto previamente.' });
    }

    // Actualizar estado del préstamo
    await pool.query(
      "UPDATE prestamos SET estado = 'Devuelto', fecha_devolucion = $1 WHERE id = $2",
      [fechaHoy, id]
    );

    // Incrementar cantidad disponible
    await pool.query(
      'UPDATE objetos SET cantidad_disponible = cantidad_disponible + 1 WHERE id = $1',
      [prestamo.objeto_id]
    );

    res.json({ message: 'Devolución registrada exitosamente.' });
  } catch (err) {
    console.error("Error en devolución:", err);
    res.status(500).json({ error: 'Error al registrar la devolución.' });
  }
});

// Ruta fallback para servir el frontend SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------------------------------------------------
// EXPORTACIÓN Y PUERTO
// -------------------------------------------------------------

// Exportar app para Vercel Serverless Functions
module.exports = app;

// Escuchar puerto únicamente en entorno local (No en producción/Vercel)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor local ejecutándose en puerto ${PORT}`));
}