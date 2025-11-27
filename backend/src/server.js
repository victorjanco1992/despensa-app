// backend/src/server.js
// Versión optimizada para Vercel Serverless
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// CORS configurado
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ======= SINGLETON POOL PARA VERCEL =======
let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 1, // Solo 1 conexión en serverless
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 10000,
    });

    // Manejar errores críticos
    pool.on('error', (err) => {
      console.error('❌ Error en pool:', err);
      pool = null; // Forzar recreación en próxima request
    });
  }
  return pool;
}

// Helper para ejecutar queries
async function query(text, params) {
  const db = getPool();
  return db.query(text, params);
}

// ======= HEALTH CHECK =======
app.get('/health', async (req, res) => {
  try {
    const result = await query('SELECT NOW() as now');
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      dbTime: result.rows[0].now,
      env: process.env.NODE_ENV || 'production'
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Despensa Khaluby',
    version: '1.0.0',
    platform: 'Vercel Serverless',
    endpoints: {
      productos: '/api/productos',
      clientes: '/api/clientes',
      cuentas: '/api/cuentas/:clienteId',
      transferencias: '/api/transferencias',
      listaCompras: '/api/lista-compras'
    }
  });
});

// ==================== RUTAS DE PRODUCTOS ====================

app.get('/api/productos', async (req, res) => {
  try {
    const result = await query("SELECT * FROM productos WHERE nombre NOT LIKE '[SUELTO]%' ORDER BY nombre");
    res.json(result.rows);
  } catch (err) {
    console.error('Error en /api/productos:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en /api/productos/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/productos', async (req, res) => {
  const { nombre, precio, unidad } = req.body;
  if (!nombre || precio === undefined || !unidad) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    const result = await query(
      'INSERT INTO productos (nombre, precio, unidad) VALUES ($1, $2, $3) RETURNING *',
      [nombre, precio, unidad]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error en POST /api/productos:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  const { nombre, precio, unidad } = req.body;
  try {
    const result = await query(
      'UPDATE productos SET nombre = $1, precio = $2, unidad = $3 WHERE id = $4 RETURNING *',
      [nombre, precio, unidad, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en PUT /api/productos/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM productos WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (err) {
    console.error('Error en DELETE /api/productos/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== RUTAS DE CLIENTES ====================

app.get('/api/clientes', async (req, res) => {
  try {
    const result = await query('SELECT * FROM clientes ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    console.error('Error en /api/clientes:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nombre, dni, domicilio, telefono, email } = req.body;
  if (!nombre || !dni) return res.status(400).json({ error: 'Nombre y DNI son requeridos' });

  try {
    const result = await query(
      'INSERT INTO clientes (nombre, dni, domicilio, telefono, email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, dni, domicilio || '', telefono || '', email || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error en POST /api/clientes:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El DNI ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const { nombre, dni, domicilio, telefono, email } = req.body;
  try {
    const result = await query(
      'UPDATE clientes SET nombre=$1, dni=$2, domicilio=$3, telefono=$4, email=$5 WHERE id=$6 RETURNING *',
      [nombre, dni, domicilio, telefono, email, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en PUT /api/clientes/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM clientes WHERE id=$1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente eliminado' });
  } catch (err) {
    console.error('Error en DELETE /api/clientes/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== RUTAS DE CUENTAS CORRIENTES ====================

app.get('/api/cuentas/:clienteId', async (req, res) => {
  try {
    const queryText = `
      SELECT cc.*, p.nombre as producto_nombre, p.unidad, c.nombre as cliente_nombre
      FROM cuentas_corrientes cc
      JOIN productos p ON cc.producto_id = p.id
      JOIN clientes c ON cc.cliente_id = c.id
      WHERE cc.cliente_id = $1
      ORDER BY cc.fecha DESC
    `;
    const result = await query(queryText, [req.params.clienteId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error en /api/cuentas/:clienteId:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cuentas', async (req, res) => {
  const { cliente_id, producto_id, cantidad } = req.body;
  if (!cliente_id || !producto_id || cantidad === undefined) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  try {
    const productoRes = await query('SELECT precio FROM productos WHERE id = $1', [producto_id]);
    if (productoRes.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const precio_unitario = Number(productoRes.rows[0].precio);
    const subtotal = Number(cantidad) * precio_unitario;

    const insertRes = await query(
      'INSERT INTO cuentas_corrientes (cliente_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cliente_id, producto_id, cantidad, precio_unitario, subtotal]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('Error en POST /api/cuentas:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cuentas/producto-suelto', async (req, res) => {
  const { cliente_id, nombre, precio, cantidad } = req.body;
  if (!cliente_id || !nombre || precio === undefined || cantidad === undefined) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const insertProducto = await client.query(
      'INSERT INTO productos (nombre, precio, unidad) VALUES ($1, $2, $3) RETURNING *',
      [`${nombre} (Suelto)`, precio, 'unidad']
    );
    const producto_id_temporal = insertProducto.rows[0].id;

    const subtotal = Number(precio) * Number(cantidad);

    const insertCuenta = await client.query(
      'INSERT INTO cuentas_corrientes (cliente_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cliente_id, producto_id_temporal, cantidad, precio, subtotal]
    );

    await client.query(
      'UPDATE productos SET nombre = $1 WHERE id = $2',
      [`[SUELTO] ${nombre}`, producto_id_temporal]
    );

    await client.query('COMMIT');

    res.status(201).json(insertCuenta.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en /api/cuentas/producto-suelto:', err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

app.put('/api/cuentas/:clienteId/actualizar-precios', async (req, res) => {
  const clienteId = req.params.clienteId;
  try {
    const updateQuery = `
      UPDATE cuentas_corrientes cc
      SET precio_unitario = p.precio,
          subtotal = cc.cantidad * p.precio
      FROM productos p
      WHERE p.id = cc.producto_id
        AND cc.cliente_id = $1
        AND p.nombre NOT LIKE '[SUELTO]%'
    `;
    const result = await query(updateQuery, [clienteId]);
    res.json({ mensaje: 'Precios actualizados', cambios: result.rowCount });
  } catch (err) {
    console.error('Error en /api/cuentas/actualizar-precios:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cuentas/:clienteId/cancelar', async (req, res) => {
  try {
    const result = await query('DELETE FROM cuentas_corrientes WHERE cliente_id = $1', [req.params.clienteId]);
    res.json({ mensaje: 'Cuenta cancelada', itemsEliminados: result.rowCount });
  } catch (err) {
    console.error('Error en /api/cuentas/cancelar:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cuentas/item/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM cuentas_corrientes WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Item no encontrado' });
    res.json({ mensaje: 'Item eliminado' });
  } catch (err) {
    console.error('Error en DELETE /api/cuentas/item/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== RUTAS DE TRANSFERENCIAS ====================

app.get('/api/transferencias/verificar-config', (req, res) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const config = {
    tokenConfigurado: !!accessToken && accessToken !== 'tu_access_token_aqui',
    longitudToken: accessToken ? accessToken.length : 0,
    inicioToken: accessToken && accessToken !== 'tu_access_token_aqui'
      ? accessToken.substring(0, 15) + '...'
      : 'No configurado',
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'production'
  };
  res.json(config);
});

app.get('/api/transferencias/sincronizar', async (req, res) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken || accessToken === 'tu_access_token_aqui') {
    return res.status(400).json({
      error: 'Token de Mercado Pago no configurado',
      mensaje: 'Configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno'
    });
  }

  try {
    const fetch = globalThis.fetch || (await import('node-fetch')).default;

    const url = `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=NOW-30DAYS&end_date=NOW&status=approved`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let mensajeUsuario = 'Error al conectar con Mercado Pago';
      if (response.status === 401) mensajeUsuario = 'Token inválido o expirado';
      else if (response.status === 403) mensajeUsuario = 'Token sin permisos suficientes';

      return res.status(response.status).json({
        error: mensajeUsuario,
        mensaje: `Error ${response.status}: ${errorText}`
      });
    }

    const data = await response.json();
    const resultados = data.results || [];

    let nuevas = 0;

    for (const pago of resultados) {
      try {
        const existeRes = await query(
          'SELECT id FROM transferencias WHERE observaciones LIKE $1 LIMIT 1',
          [`%MP_ID:${pago.id}%`]
        );

        if (existeRes.rows.length === 0) {
          let nombre = 'Desconocido';
          
          if (pago.payer?.first_name && pago.payer?.last_name) {
            nombre = `${pago.payer.first_name} ${pago.payer.last_name}`.trim();
          } else if (pago.payer?.first_name) {
            nombre = pago.payer.first_name.trim();
          } else if (pago.payer?.email) {
            nombre = pago.payer.email.split('@')[0];
          } else if (pago.additional_info?.payer?.first_name) {
            nombre = pago.additional_info.payer.first_name;
            if (pago.additional_info.payer.last_name) {
              nombre += ` ${pago.additional_info.payer.last_name}`;
            }
          } else if (pago.description) {
            nombre = pago.description;
          }

          const monto = pago.transaction_amount || 0;

          let fuente = 'Desconocido';
          const metodoPago = pago.payment_method_id || '';
          const tipoPago = pago.payment_type_id || '';
          
          if (metodoPago === 'cvu' || metodoPago === 'cbu') {
            fuente = 'Transferencia';
          } else if (tipoPago === 'account_money') {
            const desc = (pago.description || '').toLowerCase();
            const hasAlias = desc.includes('alias') || desc.includes('transferencia');
            fuente = hasAlias ? 'Transferencia Alias' : 'Transferencia';
          } else if (tipoPago === 'debit_card') {
            fuente = 'Tarjeta Débito';
          } else if (tipoPago === 'credit_card') {
            fuente = 'Tarjeta Crédito';
          } else if (metodoPago === 'pix' || pago.operation_type === 'regular_payment') {
            fuente = 'QR';
          } else if (pago.point_of_interaction?.type === 'OPENPLATFORM') {
            fuente = 'POS/Point';
          } else if (metodoPago) {
            fuente = metodoPago.toUpperCase();
          }

          let fechaISO = pago.date_approved || pago.date_created;
          const obs = `FUENTE:${fuente}|MP_ID:${pago.id}|DESC:${pago.description || 'Sin descripción'}|METODO:${metodoPago}|TIPO:${tipoPago}`;

          await query(
            'INSERT INTO transferencias (nombre, monto, fecha_hora, observaciones) VALUES ($1, $2, $3, $4)',
            [nombre, monto, fechaISO, obs]
          );

          nuevas++;
        }
      } catch (innerErr) {
        console.error(`Error procesando pago ${pago.id}:`, innerErr);
      }
    }

    res.json({
      success: true,
      mensaje: nuevas > 0 
        ? `Sincronización exitosa. ${nuevas} transferencia${nuevas > 1 ? 's' : ''} nueva${nuevas > 1 ? 's' : ''}` 
        : 'Sincronización exitosa. No hay transferencias nuevas',
      total: resultados.length,
      nuevas
    });
  } catch (err) {
    console.error('Error al sincronizar con Mercado Pago:', err);
    res.status(500).json({
      error: 'Error al sincronizar con Mercado Pago',
      mensaje: err.message
    });
  }
});

app.get('/api/transferencias', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    let where = '';
    const params = [];

    if (search) {
      where = 'WHERE nombre ILIKE $1';
      params.push(`%${search}%`);
    }

    const countQuery = `SELECT COUNT(*) as total FROM transferencias ${where}`;
    const countRes = await query(countQuery, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;

    const queryText = `SELECT * FROM transferencias ${where} ORDER BY fecha_hora DESC LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`;
    const result = await query(queryText, [...params, limit, offset]);

    res.json({
      transferencias: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('Error en /api/transferencias:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== RUTAS DE LISTA DE COMPRAS ====================

app.get('/api/lista-compras', async (req, res) => {
  try {
    const queryText = `
      SELECT 
        lc.*,
        COALESCE(p.nombre, lc.nombre_temporal) as producto_nombre,
        COALESCE(p.unidad, lc.unidad_temporal) as unidad,
        p.precio as precio_venta,
        CASE WHEN lc.nombre_temporal IS NOT NULL THEN true ELSE false END as es_temporal
      FROM lista_compras lc
      LEFT JOIN productos p ON lc.producto_id = p.id
      ORDER BY lc.comprado ASC, lc.fecha_agregado DESC
    `;
    const result = await query(queryText);
    res.json(result.rows);
  } catch (err) {
    console.error('Error en /api/lista-compras:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/lista-compras', async (req, res) => {
  const { producto_id, nombre_temporal, unidad_temporal, cantidad, precio_mayorista } = req.body;
  
  if (!producto_id && !nombre_temporal) {
    return res.status(400).json({ error: 'Debe proporcionar producto_id o nombre_temporal' });
  }
  
  if (cantidad === undefined) {
    return res.status(400).json({ error: 'La cantidad es requerida' });
  }

  try {
    if (nombre_temporal) {
      const result = await query(
        `INSERT INTO lista_compras (nombre_temporal, unidad_temporal, cantidad, precio_mayorista) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [nombre_temporal, unidad_temporal || 'unidad', cantidad, precio_mayorista || 0]
      );
      return res.status(201).json(result.rows[0]);
    }
    
    const existente = await query(
      'SELECT * FROM lista_compras WHERE producto_id = $1 AND comprado = FALSE',
      [producto_id]
    );

    if (existente.rows.length > 0) {
      const result = await query(
        `UPDATE lista_compras 
         SET cantidad = cantidad + $1, 
             precio_mayorista = COALESCE($2, precio_mayorista)
         WHERE id = $3 
         RETURNING *`,
        [cantidad, precio_mayorista || 0, existente.rows[0].id]
      );
      return res.json(result.rows[0]);
    } else {
      const result = await query(
        `INSERT INTO lista_compras (producto_id, cantidad, precio_mayorista) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [producto_id, cantidad, precio_mayorista || 0]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error en POST /api/lista-compras:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/lista-compras/marcar-todo-comprado', async (req, res) => {
  try {
    const result = await query(
      `UPDATE lista_compras 
       SET comprado = TRUE, 
           fecha_comprado = NOW() 
       WHERE comprado = FALSE`
    );
    res.json({ 
      mensaje: 'Toda la lista marcada como comprada', 
      itemsActualizados: result.rowCount 
    });
  } catch (err) {
    console.error('Error en /api/lista-compras/marcar-todo-comprado:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lista-compras/comprados/limpiar', async (req, res) => {
  try {
    const result = await query('DELETE FROM lista_compras WHERE comprado = TRUE');
    res.json({ 
      mensaje: 'Lista comprada limpiada', 
      itemsEliminados: result.rowCount 
    });
  } catch (err) {
    console.error('Error en DELETE /api/lista-compras/comprados/limpiar:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/lista-compras/:id/toggle', async (req, res) => {
  try {
    const result = await query(
      `UPDATE lista_compras 
       SET comprado = NOT comprado,
           fecha_comprado = CASE WHEN NOT comprado THEN NOW() ELSE NULL END
       WHERE id = $1 
       RETURNING *`,
      [req.params.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en /api/lista-compras/:id/toggle:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/lista-compras/:id', async (req, res) => {
  const { cantidad, precio_mayorista } = req.body;
  
  try {
    const result = await query(
      `UPDATE lista_compras 
       SET cantidad = $1, 
           precio_mayorista = $2
       WHERE id = $3 
       RETURNING *`,
      [cantidad, precio_mayorista, req.params.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en PUT /api/lista-compras/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/lista-compras/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM lista_compras WHERE id = $1',
      [req.params.id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    
    res.json({ mensaje: 'Item eliminado' });
  } catch (err) {
    console.error('Error en DELETE /api/lista-compras/:id:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== RUTA DE LOGIN ====================
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  const correctPassword = process.env.PASSWORD;
  if (password === correctPassword) {
    res.json({ success: true, mensaje: 'Login exitoso' });
  } else {
    res.status(401).json({ success: false, mensaje: 'Contraseña incorrecta' });
  }
});

// ==================== EXPORT PARA VERCEL ====================
module.exports = app;

// Solo inicia servidor si NO está en Vercel
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
}
