// Al inicio del archivo, después de los requires
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: [
    'https://despensa-frontend.onrender.com',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

// Conexión a la base de datos SQLite
const db = new sqlite3.Database('./despensa.db', (err) => {
  if (err) {
    console.error('Error al conectar con la base de datos:', err);
  } else {
    console.log('Conectado a SQLite');
    inicializarDB();
  }
});

// Inicializar tablas
function inicializarDB() {
  // Tabla de productos
  db.run(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      unidad TEXT NOT NULL CHECK(unidad IN ('unidad', 'kg', 'litros'))
    )
  `);

  // Tabla de clientes
  db.run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      dni TEXT NOT NULL UNIQUE,
      domicilio TEXT,
      telefono TEXT,
      email TEXT
    )
  `);

  // Tabla de cuentas corrientes
  db.run(`
    CREATE TABLE IF NOT EXISTS cuentas_corrientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      producto_id INTEGER NOT NULL,
      cantidad REAL NOT NULL,
      precio_unitario REAL NOT NULL,
      subtotal REAL NOT NULL,
      fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )
  `);

  // Tabla de transferencias (independiente de cuentas)
  db.run(`
    CREATE TABLE IF NOT EXISTS transferencias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      monto REAL NOT NULL,
      fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      observaciones TEXT
    )
  `);
}

// ==================== RUTAS DE PRODUCTOS ====================

// Obtener todos los productos (excluir productos sueltos)
app.get('/api/productos', (req, res) => {
  db.all("SELECT * FROM productos WHERE nombre NOT LIKE '[SUELTO]%' ORDER BY nombre", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Obtener un producto por ID
app.get('/api/productos/:id', (req, res) => {
  db.get('SELECT * FROM productos WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(row);
  });
});

// Crear producto
app.post('/api/productos', (req, res) => {
  const { nombre, precio, unidad } = req.body;
  
  if (!nombre || !precio || !unidad) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  db.run(
    'INSERT INTO productos (nombre, precio, unidad) VALUES (?, ?, ?)',
    [nombre, precio, unidad],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, nombre, precio, unidad });
    }
  );
});

// Actualizar producto
app.put('/api/productos/:id', (req, res) => {
  const { nombre, precio, unidad } = req.body;
  
  db.run(
    'UPDATE productos SET nombre = ?, precio = ?, unidad = ? WHERE id = ?',
    [nombre, precio, unidad, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json({ id: req.params.id, nombre, precio, unidad });
    }
  );
});

// Eliminar producto
app.delete('/api/productos/:id', (req, res) => {
  db.run('DELETE FROM productos WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ mensaje: 'Producto eliminado' });
  });
});

// ==================== RUTAS DE CLIENTES ====================

// Obtener todos los clientes
app.get('/api/clientes', (req, res) => {
  db.all('SELECT * FROM clientes ORDER BY nombre', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Crear cliente
app.post('/api/clientes', (req, res) => {
  const { nombre, dni, domicilio, telefono, email } = req.body;
  
  if (!nombre || !dni) {
    return res.status(400).json({ error: 'Nombre y DNI son requeridos' });
  }

  db.run(
    'INSERT INTO clientes (nombre, dni, domicilio, telefono, email) VALUES (?, ?, ?, ?, ?)',
    [nombre, dni, domicilio || '', telefono || '', email || ''],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'El DNI ya existe' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, nombre, dni, domicilio, telefono, email });
    }
  );
});

// Actualizar cliente
app.put('/api/clientes/:id', (req, res) => {
  const { nombre, dni, domicilio, telefono, email } = req.body;
  
  db.run(
    'UPDATE clientes SET nombre = ?, dni = ?, domicilio = ?, telefono = ?, email = ? WHERE id = ?',
    [nombre, dni, domicilio, telefono, email, req.params.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      res.json({ id: req.params.id, nombre, dni, domicilio, telefono, email });
    }
  );
});

// Eliminar cliente
app.delete('/api/clientes/:id', (req, res) => {
  db.run('DELETE FROM clientes WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    res.json({ mensaje: 'Cliente eliminado' });
  });
});

// ==================== RUTAS DE CUENTAS CORRIENTES ====================

// Obtener cuenta corriente de un cliente
app.get('/api/cuentas/:clienteId', (req, res) => {
  const query = `
    SELECT cc.*, p.nombre as producto_nombre, p.unidad, c.nombre as cliente_nombre
    FROM cuentas_corrientes cc
    JOIN productos p ON cc.producto_id = p.id
    JOIN clientes c ON cc.cliente_id = c.id
    WHERE cc.cliente_id = ?
    ORDER BY cc.fecha DESC
  `;
  
  db.all(query, [req.params.clienteId], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Agregar producto a cuenta corriente
app.post('/api/cuentas', (req, res) => {
  const { cliente_id, producto_id, cantidad } = req.body;
  
  if (!cliente_id || !producto_id || !cantidad) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  // Obtener el precio actual del producto
  db.get('SELECT precio FROM productos WHERE id = ?', [producto_id], (err, producto) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const precio_unitario = producto.precio;
    const subtotal = cantidad * precio_unitario;

    db.run(
      'INSERT INTO cuentas_corrientes (cliente_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
      [cliente_id, producto_id, cantidad, precio_unitario, subtotal],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ 
          id: this.lastID, 
          cliente_id, 
          producto_id, 
          cantidad, 
          precio_unitario, 
          subtotal 
        });
      }
    );
  });
});

// Agregar producto suelto a cuenta corriente (sin agregarlo al catálogo)
app.post('/api/cuentas/producto-suelto', (req, res) => {
  const { cliente_id, nombre, precio, cantidad } = req.body;
  
  if (!cliente_id || !nombre || !precio || !cantidad) {
    return res.status(400).json({ error: 'Faltan datos requeridos' });
  }

  // Crear un producto temporal solo para esta cuenta
  // Usamos un ID negativo o un identificador especial
  db.run(
    'INSERT INTO productos (nombre, precio, unidad) VALUES (?, ?, ?)',
    [nombre + ' (Suelto)', precio, 'unidad'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      const producto_id_temporal = this.lastID;
      const subtotal = cantidad * precio;

      // Agregar a la cuenta corriente
      db.run(
        'INSERT INTO cuentas_corrientes (cliente_id, producto_id, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?)',
        [cliente_id, producto_id_temporal, cantidad, precio, subtotal],
        function(err) {
          if (err) {
            // Si falla, eliminar el producto temporal
            db.run('DELETE FROM productos WHERE id = ?', [producto_id_temporal]);
            return res.status(500).json({ error: err.message });
          }

          // Marcar el producto como temporal/suelto para poder identificarlo
          db.run(
            'UPDATE productos SET nombre = ? WHERE id = ?',
            [`[SUELTO] ${nombre}`, producto_id_temporal],
            () => {
              res.status(201).json({ 
                id: this.lastID, 
                cliente_id, 
                producto_id: producto_id_temporal, 
                cantidad, 
                precio_unitario: precio, 
                subtotal 
              });
            }
          );
        }
      );
    }
  );
});

// Actualizar precios en cuenta corriente de un cliente
app.put('/api/cuentas/:clienteId/actualizar-precios', (req, res) => {
  const query = `
    UPDATE cuentas_corrientes
    SET precio_unitario = (SELECT precio FROM productos WHERE id = cuentas_corrientes.producto_id),
        subtotal = cantidad * (SELECT precio FROM productos WHERE id = cuentas_corrientes.producto_id)
    WHERE cliente_id = ?
    AND producto_id IN (
      SELECT id FROM productos WHERE nombre NOT LIKE '[SUELTO]%'
    )
  `;
  
  db.run(query, [req.params.clienteId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ mensaje: 'Precios actualizados', cambios: this.changes });
  });
});

// Cancelar cuenta corriente (eliminar todos los items)
app.delete('/api/cuentas/:clienteId/cancelar', (req, res) => {
  db.run('DELETE FROM cuentas_corrientes WHERE cliente_id = ?', [req.params.clienteId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ mensaje: 'Cuenta cancelada', itemsEliminados: this.changes });
  });
});

// Eliminar un item específico de la cuenta
app.delete('/api/cuentas/item/:id', (req, res) => {
  db.run('DELETE FROM cuentas_corrientes WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Item no encontrado' });
    }
    res.json({ mensaje: 'Item eliminado' });
  });
});

// ==================== RUTAS DE TRANSFERENCIAS ====================

// Verificar configuración de Mercado Pago
app.get('/api/transferencias/verificar-config', (req, res) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  const config = {
    tokenConfigurado: !!accessToken && accessToken !== 'tu_access_token_aqui',
    longitudToken: accessToken ? accessToken.length : 0,
    inicioToken: accessToken && accessToken !== 'tu_access_token_aqui' 
      ? accessToken.substring(0, 15) + '...' 
      : 'No configurado',
    nodeVersion: process.version
  };
  
  res.json(config);
});

// Sincronizar transferencias desde Mercado Pago
app.get('/api/transferencias/sincronizar', async (req, res) => {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  
  console.log('=== INICIO SINCRONIZACIÓN ===');
  console.log('Token configurado:', !!accessToken);
  console.log('Token válido:', accessToken && accessToken !== 'tu_access_token_aqui');
  
  if (!accessToken || accessToken === 'tu_access_token_aqui') {
    console.log('❌ Token no configurado');
    return res.status(400).json({ 
      error: 'Token de Mercado Pago no configurado',
      mensaje: 'Configura MERCADOPAGO_ACCESS_TOKEN en el archivo .env'
    });
  }

  try {
    // Importar fetch si estás en Node < 18
    const fetch = globalThis.fetch || (await import('node-fetch')).default;
    
    // Obtener pagos recibidos de los últimos 30 días
    // Traer TODOS los tipos de pago (transferencias, QR, tarjetas, Point)
    const url = `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=NOW-30DAYS&end_date=NOW&status=approved`;
    
    console.log('Consultando Mercado Pago...');
    console.log('URL:', url);
    
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
      
      if (response.status === 401) {
        mensajeUsuario = 'Token inválido o expirado. Verifica tu Access Token en Mercado Pago Developers';
      } else if (response.status === 403) {
        mensajeUsuario = 'Token sin permisos suficientes. Asegúrate de usar un Access Token válido';
      } else if (response.status === 404) {
        mensajeUsuario = 'Endpoint no encontrado. Verifica la URL de la API';
      }
      
      return res.status(response.status).json({
        error: mensajeUsuario,
        mensaje: `Error ${response.status}: ${errorText}`,
        status: response.status
      });
    }

    const data = await response.json();
    console.log('Pagos recibidos:', data.results?.length || 0);
    
    // Procesar y guardar las transferencias
    let nuevas = 0;
    const resultados = data.results || [];
    
    for (const pago of resultados) {
      try {
        // Verificar si ya existe
        const existe = await new Promise((resolve, reject) => {
          db.get(
            'SELECT id FROM transferencias WHERE observaciones LIKE ?',
            [`%MP_ID:${pago.id}%`],
            (err, row) => {
              if (err) reject(err);
              else resolve(row);
            }
          );
        });

        if (!existe) {
          // Insertar nueva transferencia
          await new Promise((resolve, reject) => {
            const nombre = pago.payer?.first_name || pago.payer?.email || 'Desconocido';
            const monto = pago.transaction_amount || 0;
            const obs = `MP_ID:${pago.id} - ${pago.description || 'Sin descripción'}`;
            
            console.log(`Insertando: ${nombre} - ${monto}`);
            
            db.run(
              'INSERT INTO transferencias (nombre, monto, observaciones) VALUES (?, ?, ?)',
              [nombre, monto, obs],
              function(err) {
                if (err) {
                  console.error('Error al insertar transferencia:', err);
                  reject(err);
                } else {
                  resolve();
                }
              }
            );
          });
          nuevas++;
        }
      } catch (error) {
        console.error(`Error procesando pago ${pago.id}:`, error);
      }
    }

    console.log(`✅ Sincronización completada. ${nuevas} nuevas de ${resultados.length} totales`);

    res.json({ 
      success: true,
      mensaje: nuevas > 0 
        ? `Sincronización exitosa. ${nuevas} transferencias nuevas` 
        : 'Sincronización exitosa. No hay transferencias nuevas',
      total: resultados.length,
      nuevas
    });

  } catch (error) {
    console.error('❌ Error al sincronizar con Mercado Pago:', error);
    res.status(500).json({ 
      error: 'Error al sincronizar con Mercado Pago',
      mensaje: error.message,
      detalles: 'Revisa la consola del servidor para más información'
    });
  }
});

// Obtener todas las transferencias con paginación y búsqueda
app.get('/api/transferencias', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || '';
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM transferencias';
  let countQuery = 'SELECT COUNT(*) as total FROM transferencias';
  let params = [];
  
  if (search) {
    query += ' WHERE nombre LIKE ?';
    countQuery += ' WHERE nombre LIKE ?';
    params.push(`%${search}%`);
  }
  
  query += ' ORDER BY fecha_hora DESC LIMIT ? OFFSET ?';
  
  // Obtener total de registros
  db.get(countQuery, params, (err, countResult) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    // Obtener registros paginados
    db.all(query, [...params, limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      res.json({
        transferencias: rows,
        total: countResult.total,
        page,
        totalPages: Math.ceil(countResult.total / limit)
      });
    });
  });
});

// Crear transferencia
app.post('/api/transferencias', (req, res) => {
  const { nombre, monto, observaciones } = req.body;
  
  if (!nombre || !monto) {
    return res.status(400).json({ error: 'Nombre y monto son requeridos' });
  }

  db.run(
    'INSERT INTO transferencias (nombre, monto, observaciones) VALUES (?, ?, ?)',
    [nombre, monto, observaciones || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ 
        id: this.lastID, 
        nombre, 
        monto, 
        observaciones 
      });
    }
  );
});

// Eliminar transferencia
app.delete('/api/transferencias/:id', (req, res) => {
  db.run('DELETE FROM transferencias WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Transferencia no encontrada' });
    }
    res.json({ mensaje: 'Transferencia eliminada' });
  });
});

// ==================== RUTA DE LOGIN ====================

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  
  if (password === '1234') {
    res.json({ success: true, mensaje: 'Login exitoso' });
  } else {
    res.status(401).json({ success: false, mensaje: 'Contraseña incorrecta' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Cerrar la base de datos al terminar
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Base de datos cerrada');
    process.exit(0);
  });
});
