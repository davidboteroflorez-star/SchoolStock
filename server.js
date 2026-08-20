const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./db');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// DASHBOARD
app.get('/api/dashboard', async (req, res) => {
  try {
    const totalObj = await pool.query('SELECT SUM(cantidad_total) AS total FROM objetos');
    const dispObj = await pool.query('SELECT SUM(cantidad_disponible) AS total FROM objetos');
    const prestObj = await pool.query("SELECT COUNT(*) AS total FROM prestamos WHERE estado = 'Prestado'");

    res.json({
      totalObjetos: parseInt(totalObj.rows[0].total) || 0,
      disponibles: parseInt(dispObj.rows[0].total) || 0,
      prestados: parseInt(prestObj.rows[0].total) || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// OBJETOS / INVENTARIO
app.get('/api/objetos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM objetos ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/objetos', async (req, res) => {
  const { nombre, categoria, codigo, descripcion, cantidad_total, ubicacion, observaciones } = req.body;
  try {
    await pool.query(
      `INSERT INTO objetos (nombre, categoria, codigo, descripcion, cantidad_total, cantidad_disponible, ubicacion, observaciones)
       VALUES ($1, $2, $3, $4, $5, $5, $6, $7)`,
      [nombre, categoria, codigo, descripcion, cantidad_total, ubicacion, observaciones]
    );
    res.status(201).json({ message: 'Objeto registrado.' });
  } catch (err) {
    res.status(400).json({ error: 'El código ya existe o datos inválidos.' });
  }
});

// PRÉSTAMOS (Ajustado con zona horaria de Colombia)
app.post('/api/prestamos', async (req, res) => {
  const { estudiante, documento, curso, docente_responsable, objeto_id, cantidad, observaciones } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const objRes = await client.query('SELECT * FROM objetos WHERE id = $1', [objeto_id]);
    const objeto = objRes.rows[0];

    if (!objeto) throw new Error('El objeto no existe.');
    if (objeto.cantidad_disponible < cantidad) throw new Error('Stock insuficiente.');

    const nuevaDisp = objeto.cantidad_disponible - cantidad;
    const nuevoEstado = nuevaDisp === 0 ? 'No Disponible' : objeto.estado;

    await client.query('UPDATE objetos SET cantidad_disponible = $1, estado = $2 WHERE id = $3', [nuevaDisp, nuevoEstado, objeto_id]);
    await client.query(
      `INSERT INTO prestamos (estudiante, documento, curso, docente_responsable, objeto_id, cantidad, fecha_prestamo, hora_prestamo, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date, (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::time, $7)`,
      [estudiante, documento, curso, docente_responsable, objeto_id, cantidad, observaciones]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Préstamo registrado exitosamente.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// DEVOLUCIONES (Ajustado con zona horaria de Colombia)
app.post('/api/prestamos/:id/devolver', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const prestRes = await client.query('SELECT * FROM prestamos WHERE id = $1', [id]);
    const prestamo = prestRes.rows[0];

    if (!prestamo) throw new Error('Préstamo no encontrado.');
    if (prestamo.estado === 'Devuelto') throw new Error('Este préstamo ya fue devuelto.');

    const objRes = await client.query('SELECT * FROM objetos WHERE id = $1', [prestamo.objeto_id]);
    const objeto = objRes.rows[0];

    const nuevaDisp = objeto.cantidad_disponible + prestamo.cantidad;
    await client.query('UPDATE objetos SET cantidad_disponible = $1, estado = $2 WHERE id = $3', [nuevaDisp, 'Disponible', objeto.id]);
    await client.query(
      `UPDATE prestamos 
       SET fecha_devolucion = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::date, 
           hora_devolucion = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Bogota')::time, 
           estado = 'Devuelto' 
       WHERE id = $1`,
      [id]
    );

    await client.query('COMMIT');
    res.json({ message: 'Devolución registrada.' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: err.message });
  } finally {
    client.release();
  }
});

// HISTORIAL
app.get('/api/prestamos', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT p.*, o.nombre AS objeto_nombre, o.codigo AS objeto_codigo
      FROM prestamos p
      JOIN objetos o ON p.objeto_id = o.id
      ORDER BY p.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;