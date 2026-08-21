// HISTORIAL CON FORMATO DE FECHA LIMPIO Y HORA COLOMBIA
app.get('/api/prestamos', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        p.id,
        p.estudiante,
        p.documento,
        p.curso,
        p.docente_responsable,
        p.objeto_id,
        p.cantidad,
        p.estado,
        p.observaciones,
        TO_CHAR(p.fecha_prestamo, 'YYYY-MM-DD') || ' ' || TO_CHAR(p.hora_prestamo, 'HH12:MI AM') AS fecha_prestamo,
        CASE 
          WHEN p.fecha_devolucion IS NOT NULL 
          THEN TO_CHAR(p.fecha_devolucion, 'YYYY-MM-DD') || ' ' || TO_CHAR(p.hora_devolucion, 'HH12:MI AM')
          ELSE NULL 
        END AS fecha_devolucion,
        o.nombre AS objeto_nombre, 
        o.codigo AS objeto_codigo
      FROM prestamos p
      JOIN objetos o ON p.objeto_id = o.id
      ORDER BY p.id DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});