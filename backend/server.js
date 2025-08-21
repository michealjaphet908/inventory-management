const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'inventory-management-key';
app.use(cors());
app.use(express.json()) ;


const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '', 
  database: 'sims',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token available' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(email,password);
  
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(400).json({ message: 'Invalid email or password' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Credentials are required' });
  }
  try {
    const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(409).json({ message: 'Email already registered' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/spareparts', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM spare_parts');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/spareparts', authenticateToken, async (req, res) => {
  const { name, category, unit_price, total_price } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO spare_parts (name, category, unit_price, total_price) VALUES (?, ?, ?, ?)',
      [name, category, unit_price, total_price]
    );
    res.status(201).json({ id: result.insertId, name, category, unit_price, total_price });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/spareparts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { name, category, unit_price, total_price } = req.body;
  try {
    await pool.query(
      'UPDATE spare_parts SET name = ?, category = ?, unit_price = ?, total_price = ? WHERE id = ?',
      [name, category, unit_price, total_price, id]
    );
    res.json({ id, name, category, unit_price, total_price });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/spareparts/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM stock_in WHERE spare_part_id = ?', [id]);
    await pool.query('DELETE FROM stock_out WHERE spare_part_id = ?', [id]);
    await pool.query('DELETE FROM spare_parts WHERE id = ?', [id]);
    res.json({ message: 'Spare part and related stock records deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/stockin', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT si.id, si.spare_part_id, sp.name as spare_part_name, si.stock_in_quantity, si.stock_in_date
       FROM stock_in si
       JOIN spare_parts sp ON si.spare_part_id = sp.id
       ORDER BY si.stock_in_date DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/stockin', authenticateToken, async (req, res) => {
  const { spare_part_id, stock_in_quantity, stock_in_date } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO stock_in (spare_part_id, stock_in_quantity, stock_in_date) VALUES (?, ?, ?)',
      [spare_part_id, stock_in_quantity, stock_in_date]
    );
    res.status(201).json({ id: result.insertId, spare_part_id, stock_in_quantity, stock_in_date });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/stockout', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT so.id, so.spare_part_id, sp.name as spare_part_name, so.stock_out_quantity, so.stock_out_unit_price, so.stock_out_total_price, so.stock_out_date
       FROM stock_out so
       JOIN spare_parts sp ON so.spare_part_id = sp.id
       ORDER BY so.stock_out_date DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.post('/api/stockout', authenticateToken, async (req, res) => {
  const { spare_part_id, stock_out_quantity, stock_out_unit_price, stock_out_total_price, stock_out_date } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[{ total_stock_in = 0 }]] = await connection.query(
      'SELECT IFNULL(SUM(stock_in_quantity), 0) as total_stock_in FROM stock_in WHERE spare_part_id = ?',
      [spare_part_id]
    );
    const [[{ total_stock_out = 0 }]] = await connection.query(
      'SELECT IFNULL(SUM(stock_out_quantity), 0) as total_stock_out FROM stock_out WHERE spare_part_id = ?',
      [spare_part_id]
    );
    const available_stock = total_stock_in - total_stock_out;

    if (stock_out_quantity > available_stock) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: 'Insufficient stock available' });
    }

    const [result] = await connection.query(
      'INSERT INTO stock_out (spare_part_id, stock_out_quantity, stock_out_unit_price, stock_out_total_price, stock_out_date) VALUES (?, ?, ?, ?, ?)',
      [spare_part_id, stock_out_quantity, stock_out_unit_price, stock_out_total_price, stock_out_date]
    );

    let remainingQty = stock_out_quantity;
    const [stockIns] = await connection.query(
      'SELECT id, stock_in_quantity FROM stock_in WHERE spare_part_id = ? AND stock_in_quantity > 0 ORDER BY stock_in_date ASC',
      [spare_part_id]
    );

    for (const stockIn of stockIns) {
      if (remainingQty <= 0) break;
      const deductQty = Math.min(stockIn.stock_in_quantity, remainingQty);
      await connection.query(
        'UPDATE stock_in SET stock_in_quantity = stock_in_quantity - ? WHERE id = ?',
        [deductQty, stockIn.id]
      );
      remainingQty -= deductQty;
    }

    await connection.commit();
    connection.release();

    res.status(201).json({ id: result.insertId, spare_part_id, stock_out_quantity, stock_out_unit_price, stock_out_total_price, stock_out_date });
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.put('/api/stockout/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { spare_part_id, stock_out_quantity, stock_out_unit_price, stock_out_total_price, stock_out_date } = req.body;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[{ total_stock_in = 0 }]] = await connection.query(
      'SELECT IFNULL(SUM(stock_in_quantity), 0) as total_stock_in FROM stock_in WHERE spare_part_id = ?',
      [spare_part_id]
    );
    const [[{ total_stock_out = 0 }]] = await connection.query(
      'SELECT IFNULL(SUM(stock_out_quantity), 0) as total_stock_out FROM stock_out WHERE spare_part_id = ? AND id != ?',
      [spare_part_id, id]
    );
    const available_stock = total_stock_in - total_stock_out;

    if (stock_out_quantity > available_stock) {
      await connection.rollback();
      connection.release();
      return res.status(400).json({ message: 'Insufficient stock available' });
    }

    const [[currentStockOut]] = await connection.query(
      'SELECT stock_out_quantity FROM stock_out WHERE id = ?',
      [id]
    );
    const currentQty = currentStockOut ? currentStockOut.stock_out_quantity : 0;

    await connection.query(
      'UPDATE stock_out SET spare_part_id = ?, stock_out_quantity = ?, stock_out_unit_price = ?, stock_out_total_price = ?, stock_out_date = ? WHERE id = ?',
      [spare_part_id, stock_out_quantity, stock_out_unit_price, stock_out_total_price, stock_out_date, id]
    );

    const qtyDiff = stock_out_quantity - currentQty;

    if (qtyDiff !== 0) {
      let remainingQty = Math.abs(qtyDiff);
      if (qtyDiff > 0) {
        const [stockIns] = await connection.query(
          'SELECT id, stock_in_quantity FROM stock_in WHERE spare_part_id = ? AND stock_in_quantity > 0 ORDER BY stock_in_date ASC',
          [spare_part_id]
        );
        for (const stockIn of stockIns) {
          if (remainingQty <= 0) break;
          const deductQty = Math.min(stockIn.stock_in_quantity, remainingQty);
          await connection.query(
            'UPDATE stock_in SET stock_in_quantity = stock_in_quantity - ? WHERE id = ?',
            [deductQty, stockIn.id]
          );
          remainingQty -= deductQty;
        }
      } else {
        
        const [stockIns] = await connection.query(
          'SELECT id, stock_in_quantity FROM stock_in WHERE spare_part_id = ? ORDER BY stock_in_date DESC',
          [spare_part_id]
        );
        for (const stockIn of stockIns) {
          if (remainingQty <= 0) break;
          await connection.query(
            'UPDATE stock_in SET stock_in_quantity = stock_in_quantity + ? WHERE id = ?',
            [remainingQty, stockIn.id]
          );
          remainingQty = 0;
        }
      }
    }

    await connection.commit();
    connection.release();

    res.json({ id, spare_part_id, stock_out_quantity, stock_out_unit_price, stock_out_total_price, stock_out_date });
  } catch (error) {
    await connection.rollback();
    connection.release();
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.delete('/api/stockout/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM stock_out WHERE id = ?', [id]);
    res.json({ message: 'Stock out record deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


app.get('/api/reports/daily-stockout', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT stock_out_date, spare_part_id, sp.name as spare_part_name, SUM(stock_out_quantity) as total_quantity, SUM(stock_out_total_price) as total_price
       FROM stock_out so
       JOIN spare_parts sp ON so.spare_part_id = sp.id
       GROUP BY stock_out_date, spare_part_id, sp.name
       ORDER BY stock_out_date DESC`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.get('/api/reports/stock-status', authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT sp.id as spare_part_id, sp.name as spare_part_name,
        IFNULL(SUM(si.stock_in_quantity), 0) as total_stock_in,
        IFNULL(SUM(so.stock_out_quantity), 0) as total_stock_out,
        (IFNULL(SUM(si.stock_in_quantity), 0) - IFNULL(SUM(so.stock_out_quantity), 0)) as remaining_quantity
       FROM spare_parts sp
       LEFT JOIN stock_in si ON sp.id = si.spare_part_id
       LEFT JOIN stock_out so ON sp.id = so.spare_part_id
       GROUP BY sp.id, sp.name`
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
