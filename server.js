// server.js
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// -------------------------------------------------------------
// DASHBOARD - Estadísticas en Tiempo Real
// -------------------------------------------------------------
app.get('/api/dashboard', (req, res) => {
  try {
    const totalObjetos = db.prepare('SELECT SUM(cantidad_total) AS total FROM objetos').get().total || 0;
    const disponibles = db.prepare('SELECT SUM(cantidad_disponible) AS total FROM objetos').get().total || 0;
    const prestados = db.prepare("SELECT COUNT(*) AS total FROM prestamos WHERE estado = 'Prestado'").get().total || 0;
    const mantenimiento = db.prepare("SELECT COUNT(*) AS total FROM objetos WHERE estado = 'En mantenimiento'").get().total || 0;
    
    const prestamosHoy = db.prepare("SELECT COUNT(*) AS total FROM prestamos WHERE fecha_prestamo = CURRENT_DATE").get().total || 0;
    const devolucionesHoy = db.prepare("SELECT COUNT(*) AS total FROM prestamos WHERE fecha_devolucion = CURRENT_DATE").get().total || 0;

    res.json({
      totalObjetos,
      disponibles,
      prestados,
      mantenimiento,
      prestamosHoy,
      devolucionesHoy
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// INVENTARIO - CRUD
// -------------------------------------------------------------
app.get('/api/objetos', (req, res) => {
  const objetos = db.prepare('SELECT * FROM objetos').all();
  res.json(objetos);
});

app.post('/api/objetos', (req, res) => {
  const { nombre, categoria, codigo, descripcion, cantidad_total, ubicacion, observaciones } = req.body;
  
  try {
    const stmt = db.prepare(`
      INSERT INTO objetos (nombre, categoria, codigo, descripcion, cantidad_total, cantidad_disponible, ubicacion, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Al crear, disponible = total
    stmt.run(nombre, categoria, codigo, descripcion, cantidad_total, cantidad_total, ubicacion, observaciones);
    res.status(201).json({ message: 'Objeto registrado con éxito.' });
  } catch (err) {
    res.status(400).json({ error: 'El código interno ya existe o datos inválidos.' });
  }
});

// -------------------------------------------------------------
// PRÉSTAMOS - Registrar Préstamo
// -------------------------------------------------------------
app.post('/api/prestamos', (req, res) => {
  const { estudiante, documento, curso, docente_responsable, objeto_id, cantidad, observaciones } = req.body;

  // Transacción atómica: verifica disponibilidad y actualiza stock
  const registrarPrestamo = db.transaction(() => {
    const objeto = db.prepare('SELECT * FROM objetos WHERE id = ?').get(objeto_id);

    if (!objeto) throw new Error('El objeto no existe.');
    if (objeto.cantidad_disponible < cantidad) throw new Error('No hay suficiente stock disponible.');
    if (objeto.estado === 'En mantenimiento') throw new Error('El objeto está en mantenimiento.');

    const nuevaDisponible = objeto.cantidad_disponible - cantidad;
    const nuevoEstado = nuevaDisponible === 0 ? 'No Disponible' : objeto.estado;

    // 1. Descontar inventario
    db.prepare('UPDATE objetos SET cantidad_disponible = ?, estado = ? WHERE id = ?')
      .run(nuevaDisponible, nuevoEstado, objeto_id);

    // 2. Crear préstamo con fecha/hora automáticas
    db.prepare(`
      INSERT INTO prestamos (estudiante, documento, curso, docente_responsable, objeto_id, cantidad, observaciones)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(estudiante, documento, curso, docente_responsable, objeto_id, cantidad, observaciones);
  });

  try {
    registrarPrestamo();
    res.status(201).json({ message: 'Préstamo registrado exitosamente.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// PRÉSTAMOS - Devolución
// -------------------------------------------------------------
app.post('/api/prestamos/:id/devolver', (req, res) => {
  const { id } = req.params;

  const registrarDevolucion = db.transaction(() => {
    const prestamo = db.prepare('SELECT * FROM prestamos WHERE id = ?').get(id);

    if (!prestamo) throw new Error('Préstamo no encontrado.');
    if (prestamo.estado === 'Devuelto') throw new Error('Este objeto ya fue devuelto.');

    const objeto = db.prepare('SELECT * FROM objetos WHERE id = ?').get(prestamo.objeto_id);

    const nuevaDisponible = objeto.cantidad_disponible + prestamo.cantidad;
    const nuevoEstado = objeto.estado === 'No Disponible' ? 'Disponible' : objeto.estado;

    // 1. Incrementar inventario
    db.prepare('UPDATE objetos SET cantidad_disponible = ?, estado = ? WHERE id = ?')
      .run(nuevaDisponible, nuevoEstado, objeto.id);

    // 2. Marcar devolución con hora/fecha del servidor
    db.prepare(`
      UPDATE prestamos 
      SET fecha_devolucion = CURRENT_DATE, hora_devolucion = CURRENT_TIME, estado = 'Devuelto'
      WHERE id = ?
    `).run(id);
  });

  try {
    registrarDevolucion();
    res.json({ message: 'Devolución registrada correctamente.' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// HISTORIAL Y BÚSQUEDA
// -------------------------------------------------------------
app.get('/api/prestamos', (req, res) => {
  const query = `
    SELECT p.*, o.nombre AS objeto_nombre, o.codigo AS objeto_codigo
    FROM prestamos p
    JOIN objetos o ON p.objeto_id = o.id
    ORDER BY p.id DESC
  `;
  const prestamos = db.prepare(query).all();
  res.json(prestamos);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});