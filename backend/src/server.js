// backend/src/server.js
// Versión para Deploy en Render con PostgreSQL
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000; // Render usa este puerto

// CORS configurado para Render
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ======= Conexión a PostgreSQL =======
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect()
  .then(() => {
    console.log('✅ Conectado a PostgreSQL en Render');
    inicializarDB();
  })
  .catch((err) => {
    console.error('❌ Error al conectar a PostgreSQL:', err);
  });

// Health check para Render
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'API Despensa Khaluby',
    version: '1.0.0',
    endpoints: {
      productos: '/api/productos',
      clientes: '/api/clientes',
      cuentas: '/api/cuentas/:clienteId',
      transferencias: '/api/transferencias'
    }
  });
});

// ======= Inicializar tablas (si no existen) =======
async function inicializarDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        precio DECIMAL NOT NULL,
        unidad TEXT NOT NULL CHECK (unidad IN ('unidad', 'kg', 'litros'))
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        dni TEXT NOT NULL UNIQUE,
        domicilio TEXT,
        telefono TEXT,
        email TEXT
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS cuentas_corrientes (
        id SERIAL PRIMARY KEY,
        cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
        producto_id INTEGER NOT NULL REFERENCES productos(id),
        cantidad DECIMAL NOT NULL,
        precio_unitario DECIMAL NOT NULL,
        subtotal DECIMAL NOT NULL,
        fecha TIMESTAMP DEFAULT NOW()
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS transferencias (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        monto DECIMAL NOT NULL,
        fecha_hora TIMESTAMP NOT NULL,
        observaciones TEXT
      );
    `);

    console.log('🧩 Tablas inicializadas correctamente en Render');
  } catch (err) {
    console.error('❌ Error creando tablas:', err);
  }
}

// ==================== RUTAS DE PRODUCTOS ====================

app.get('/api/productos', async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM productos WHERE nombre NOT LIKE '[SUELTO]%' ORDER BY nombre");
    res.json(result.rows);
  } catch (err) {
    console.error('/api/productos GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM productos WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('/api/productos/:id GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/productos', async (req, res) => {
  const { nombre, precio, unidad } = req.body;
  if (!nombre || precio === undefined || !unidad) return res.status(400).json({ error: 'Faltan datos requeridos' });

  try {
    const result = await db.query(
      'INSERT INTO productos (nombre, precio, unidad) VALUES ($1, $2, $3) RETURNING *',
      [nombre, precio, unidad]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('/api/productos POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/productos/:id', async (req, res) => {
  const { nombre, precio, unidad } = req.body;
  try {
    const result = await db.query(
      'UPDATE productos SET nombre = $1, precio = $2, unidad = $3 WHERE id = $4 RETURNING *',
      [nombre, precio, unidad, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('/api/productos/:id PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/productos/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM productos WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (err) {
    console.error('/api/productos/:id DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== RUTAS DE CLIENTES ====================

app.get('/api/clientes', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM clientes ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    console.error('/api/clientes GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clientes', async (req, res) => {
  const { nombre, dni, domicilio, telefono, email } = req.body;
  if (!nombre || !dni) return res.status(400).json({ error: 'Nombre y DNI son requeridos' });

  try {
    const result = await db.query(
      'INSERT INTO clientes (nombre, dni, domicilio, telefono, email) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [nombre, dni, domicilio || '', telefono || '', email || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('/api/clientes POST error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ error: 'El DNI ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const { nombre, dni, domicilio, telefono, email } = req.body;
  try {
    const result = await db.query(
      'UPDATE clientes SET nombre=$1, dni=$2, domicilio=$3, telefono=$4, email=$5 WHERE id=$6 RETURNING *',
      [nombre, dni, domicilio, telefono, email, req.params.id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('/api/clientes/:id PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM clientes WHERE id=$1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json({ mensaje: 'Cliente eliminado' });
  } catch (err) {
    console.error('/api/clientes/:id DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== RUTAS DE CUENTAS CORRIENTES ====================

app.get('/api/cuentas/:clienteId', async (req, res) => {
  try {
    const query = `
      SELECT cc.*, p.nombre as producto_nombre, p.unidad, c.nombre as cliente_nombre
      FROM cuentas_corrientes cc
      JOIN productos p ON cc.producto_id = p.id
      JOIN clientes c ON cc.cliente_id = c.id
      WHERE cc.cliente_id = $1
      ORDER BY cc.fecha DESC
    `;
    const result = await db.query(query, [req.params.clienteId]);
    res.json(result.rows);
  } catch (err) {
    console.error('/api/cuentas/:clienteId GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cuentas', async (req, res) => {
  const { cliente_id, producto_id, cantidad } = req.body;
  if (!cliente_id || !producto_id || cantidad === undefined) return res.status(400).json({ error: 'Faltan datos requeridos' });

  try {
    const productoRes = await db.query('SELECT precio FROM productos WHERE id = $1', [producto_id]);
    if (productoRes.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const precio_unitario = Number(productoRes.rows[0].precio);
    const subtotal = Number(cantidad) * precio_unitario;

    const insertRes = await db.query(
      'INSERT INTO cuentas_corrientes (cliente_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [cliente_id, producto_id, cantidad, precio_unitario, subtotal]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error('/api/cuentas POST error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cuentas/producto-suelto', async (req, res) => {
  const { cliente_id, nombre, precio, cantidad } = req.body;
  if (!cliente_id || !nombre || precio === undefined || cantidad === undefined) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  const client = await db.connect();
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
    console.error('/api/cuentas/producto-suelto POST error:', err);
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
    const result = await db.query(updateQuery, [clienteId]);
    res.json({ mensaje: 'Precios actualizados', cambios: result.rowCount });
  } catch (err) {
    console.error('/api/cuentas/:clienteId/actualizar-precios PUT error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cuentas/:clienteId/cancelar', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM cuentas_corrientes WHERE cliente_id = $1', [req.params.clienteId]);
    res.json({ mensaje: 'Cuenta cancelada', itemsEliminados: result.rowCount });
  } catch (err) {
    console.error('/api/cuentas/:clienteId/cancelar DELETE error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cuentas/item/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM cuentas_corrientes WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Item no encontrado' });
    res.json({ mensaje: 'Item eliminado' });
  } catch (err) {
    console.error('/api/cuentas/item/:id DELETE error:', err);
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
    environment: process.env.NODE_ENV || 'development'
  };
  res.json(config);
});

app.get('/api/transferencias/sincronizar', async (req, res) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  console.log('=== INICIO SINCRONIZACIÓN ===');
  console.log('Token configurado:', !!accessToken);

  if (!accessToken || accessToken === 'tu_access_token_aqui') {
    console.log('❌ Token no configurado');
    return res.status(400).json({
      error: 'Token de Mercado Pago no configurado',
      mensaje: 'Configura MERCADOPAGO_ACCESS_TOKEN en las variables de entorno'
    });
  }

  try {
    const fetch = globalThis.fetch || (await import('node-fetch')).default;

    const url = `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=NOW-30DAYS&end_date=NOW&status=approved`;

    console.log('Consultando Mercado Pago...');

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Respuesta de MP:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error de Mercado Pago:', response.status, errorText);

      let mensajeUsuario = 'Error al conectar con Mercado Pago';
      if (response.status === 401) mensajeUsuario = 'Token inválido o expirado. Verifica tu Access Token';
      else if (response.status === 403) mensajeUsuario = 'Token sin permisos suficientes';
      else if (response.status === 404) mensajeUsuario = 'Endpoint no encontrado';

      return res.status(response.status).json({
        error: mensajeUsuario,
        mensaje: `Error ${response.status}: ${errorText}`,
        status: response.status
      });
    }

    const data = await response.json();
    const resultados = data.results || [];
    console.log('Pagos recibidos:', resultados.length);

    let nuevas = 0;

    for (const pago of resultados) {
      try {
        const existeRes = await db.query(
          'SELECT id FROM transferencias WHERE observaciones LIKE $1 LIMIT 1',
          [`%MP_ID:${pago.id}%`]
        );

        if (existeRes.rows.length === 0) {
          console.log('📦 Procesando pago:', pago.id);

          // Extraer nombre completo
          let nombre = 'Desconocido';
          
          if (pago.payer) {
            if (pago.payer.first_name && pago.payer.last_name) {
              nombre = `${pago.payer.first_name} ${pago.payer.last_name}`.trim();
            } 
            else if (pago.payer.first_name) {
              nombre = pago.payer.first_name.trim();
            }
            else if (pago.payer.email) {
              nombre = pago.payer.email.split('@')[0];
            }
          }

          if (nombre === 'Desconocido' && pago.additional_info) {
            if (pago.additional_info.payer?.first_name) {
              nombre = pago.additional_info.payer.first_name;
              if (pago.additional_info.payer.last_name) {
                nombre += ` ${pago.additional_info.payer.last_name}`;
              }
            }
          }

          if (nombre === 'Desconocido' && pago.transaction_details) {
            if (pago.transaction_details.payment_method_reference_id) {
              const ref = pago.transaction_details.payment_method_reference_id;
              if (ref && ref.length > 3) {
                nombre = ref;
              }
            }
          }

          if (nombre === 'Desconocido' && pago.description) {
            nombre = pago.description;
          }

          if (nombre === 'Desconocido' && pago.metadata?.payer_name) {
            nombre = pago.metadata.payer_name;
          }

          console.log('👤 Nombre extraído:', nombre);

          const monto = pago.transaction_amount || 0;

          // Determinar fuente de pago
          let fuente = 'Desconocido';
          
          const metodoPago = pago.payment_method_id || '';
          const tipoPago = pago.payment_type_id || '';
          
          console.log(`🔍 Analizando: tipo="${tipoPago}", método="${metodoPago}"`);
          
          if (metodoPago === 'cvu' || metodoPago === 'cbu') {
            fuente = 'Transferencia';
          }
          else if (tipoPago === 'account_money') {
            const desc = (pago.description || '').toLowerCase();
            const hasAlias = desc.includes('alias') || 
                           desc.includes('transferencia') ||
                           pago.transaction_details?.external_resource_url?.includes('alias');
            
            fuente = hasAlias ? 'Transferencia Alias' : 'Transferencia';
          }
          else if (tipoPago === 'debit_card') {
            fuente = 'Tarjeta Débito';
          }
          else if (tipoPago === 'credit_card') {
            fuente = 'Tarjeta Crédito';
          }
          else if (metodoPago === 'pix' || pago.operation_type === 'regular_payment') {
            fuente = 'QR';
          }
          else if (pago.point_of_interaction?.type === 'OPENPLATFORM') {
            fuente = 'POS/Point';
          }
          else if (metodoPago) {
            fuente = metodoPago.toUpperCase();
          }
          
          console.log(`✅ Fuente determinada: ${fuente}`);

          // Fecha y hora
          let fechaISO = pago.date_approved || pago.date_created;
          console.log(`📅 Fecha original: ${fechaISO}`);

          const obs = `FUENTE:${fuente}|MP_ID:${pago.id}|DESC:${pago.description || 'Sin descripción'}|METODO:${metodoPago}|TIPO:${tipoPago}`;

          await db.query(
            'INSERT INTO transferencias (nombre, monto, fecha_hora, observaciones) VALUES ($1, $2, $3, $4)',
            [nombre, monto, fechaISO, obs]
          );

          console.log(`✅ Nueva transferencia guardada:`);
          console.log(`   - Nombre: ${nombre}`);
          console.log(`   - Monto: ${monto}`);
          console.log(`   - Fuente: ${fuente}`);
          console.log(`   - Fecha: ${fechaISO}`);
          
          nuevas++;
        }
      } catch (innerErr) {
        console.error(`❌ Error procesando pago ${pago.id}:`, innerErr);
      }
    }

    console.log(`✅ Sincronización completada. ${nuevas} nuevas de ${resultados.length} totales`);

    res.json({
      success: true,
      mensaje: nuevas > 0 
        ? `Sincronización exitosa. ${nuevas} transferencia${nuevas > 1 ? 's' : ''} nueva${nuevas > 1 ? 's' : ''}` 
        : 'Sincronización exitosa. No hay transferencias nuevas',
      total: resultados.length,
      nuevas
    });
  } catch (err) {
    console.error('❌ Error al sincronizar con Mercado Pago:', err);
    res.status(500).json({
      error: 'Error al sincronizar con Mercado Pago',
      mensaje: err.message,
      detalles: 'Revisa los logs del servidor para más información'
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
    const countRes = await db.query(countQuery, params);
    const total = parseInt(countRes.rows[0].total, 10);

    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;

    const query = `SELECT * FROM transferencias ${where} ORDER BY fecha_hora DESC LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`;
    const result = await db.query(query, [...params, limit, offset]);

    res.json({
      transferencias: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error('/api/transferencias GET error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==================== INICIO SERVIDOR ====================
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 CORS configurado para: ${process.env.FRONTEND_URL || '*'}`);
});

process.on('SIGINT', async () => {
  try {
    await db.end();
    console.log('Base de datos cerrada');
    process.exit(0);
  } catch (err) {
    console.error('Error al cerrar la base de datos', err);
    process.exit(1);
  }
});
