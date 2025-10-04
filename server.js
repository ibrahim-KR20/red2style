// server.js
// Node.js + Express + SQLite backend for RED 2 STYLE
const express = require('express');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Ensure uploads directory exists
const UPLOADS = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

// Configure multer for uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/\s+/g, '_');
    cb(null, safe);
  }
});
const upload = multer({ storage });

// Serve public files and uploads
app.use('/uploads', express.static(UPLOADS));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Init DB
const dbfile = path.join(__dirname, 'db.sqlite');
const db = new Database(dbfile);

// Initialize tables if not exists
db.exec(`
CREATE TABLE IF NOT EXISTS admin (
  id INTEGER PRIMARY KEY,
  username TEXT UNIQUE,
  passhash TEXT
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  name TEXT,
  price TEXT,
  img TEXT,
  colors TEXT,
  sizes TEXT,
  featured INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS sitecontent (
  key TEXT PRIMARY KEY,
  value TEXT
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY,
  name TEXT,
  rating INTEGER,
  text TEXT
);
`);

// Ensure an admin exists (first-run)
// You will set admin using the /setup-admin endpoint once after deployment.
const getAdmin = db.prepare('SELECT * FROM admin LIMIT 1').get();
if (!getAdmin) {
  // no default admin created automatically for security.
  console.log('No admin found. Use POST /setup-admin to create admin (one-time).');
}

// Helper: auth middleware
function authMiddleware(req, res, next){
  const h = req.headers.authorization;
  if(!h) return res.status(401).json({ error: 'No token' });
  const token = h.replace('Bearer ', '');
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.admin = payload;
    next();
  } catch(e){
    res.status(401).json({ error: 'Invalid token' });
  }
}

/* --------- Public API (no auth) --------- */

// Get products
app.get('/api/products', (req, res) => {
  const rows = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  // parse colors/sizes
  const out = rows.map(r => ({
    id: r.id,
    name: r.name,
    price: r.price,
    img: r.img,
    colors: r.colors ? JSON.parse(r.colors) : [],
    sizes: r.sizes ? JSON.parse(r.sizes) : [],
    featured: !!r.featured
  }));
  res.json(out);
});

// Get single product
app.get('/api/products/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if(!row) return res.status(404).json({error:'Not found'});
  res.json({
    id: row.id,
    name: row.name,
    price: row.price,
    img: row.img,
    colors: row.colors ? JSON.parse(row.colors) : [],
    sizes: row.sizes ? JSON.parse(row.sizes) : [],
    featured: !!row.featured
  });
});

// Get site content (about)
app.get('/api/content/:key', (req,res)=>{
  const r = db.prepare('SELECT value FROM sitecontent WHERE key=?').get(req.params.key);
  res.json({ value: r ? r.value : '' });
});

// Get reviews
app.get('/api/reviews', (req,res)=>{
  const rows = db.prepare('SELECT * FROM reviews ORDER BY id DESC').all();
  res.json(rows);
});

/* --------- Admin / Protected API (auth) --------- */

// One-time admin setup: create username+password (call once)
app.post('/setup-admin', async (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({error:'username+password required'});
  const exists = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
  if(exists) return res.status(400).json({error:'admin exists'});
  const hash = await bcrypt.hash(password, 12);
  db.prepare('INSERT INTO admin (username, passhash) VALUES (?,?)').run(username, hash);
  res.json({ok:true});
});

// Login -> returns token
app.post('/api/admin/login', async (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).json({error:'username+password required'});
  const row = db.prepare('SELECT * FROM admin WHERE username = ?').get(username);
  if(!row) return res.status(400).json({error:'invalid'});
  const ok = await bcrypt.compare(password, row.passhash);
  if(!ok) return res.status(400).json({error:'invalid'});
  const token = jwt.sign({id: row.id, username: row.username}, JWT_SECRET, { expiresIn: '6h' });
  res.json({ token });
});

// CRUD products
app.post('/api/admin/products', authMiddleware, upload.single('image'), (req,res)=>{
  const { name, price, colors='[]', sizes='[]', featured=0 } = req.body;
  const img = req.file ? '/uploads/' + req.file.filename : '';
  const stmt = db.prepare('INSERT INTO products (name, price, img, colors, sizes, featured) VALUES (?,?,?,?,?,?)');
  const info = stmt.run(name, price, img, colors, sizes, featured ? 1 : 0);
  res.json({ id: info.lastInsertRowid });
});

app.put('/api/admin/products/:id', authMiddleware, upload.single('image'), (req,res)=>{
  const { name, price, colors='[]', sizes='[]', featured=0 } = req.body;
  const id = req.params.id;
  let img = null;
  if(req.file) img = '/uploads/' + req.file.filename;
  // build update
  const cur = db.prepare('SELECT * FROM products WHERE id=?').get(id);
  if(!cur) return res.status(404).json({error:'not found'});
  const newImg = img || cur.img;
  db.prepare('UPDATE products SET name=?, price=?, img=?, colors=?, sizes=?, featured=? WHERE id=?')
    .run(name, price, newImg, colors, sizes, featured ? 1 : 0, id);
  res.json({ ok:true });
});

app.delete('/api/admin/products/:id', authMiddleware, (req,res)=>{
  const id = req.params.id;
  db.prepare('DELETE FROM products WHERE id=?').run(id);
  res.json({ ok:true });
});

// Content update
app.put('/api/admin/content/:key', authMiddleware, (req,res)=>{
  const key = req.params.key;
  const value = req.body.value || '';
  db.prepare(`INSERT INTO sitecontent (key,value) VALUES (?,?)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value`).run(key, value);
  res.json({ ok:true });
});

// Reviews management
app.post('/api/admin/reviews', authMiddleware, (req,res)=>{
  const { name, rating, text } = req.body;
  const info = db.prepare('INSERT INTO reviews (name, rating, text) VALUES (?,?,?)').run(name, rating, text);
  res.json({ id: info.lastInsertRowid });
});
app.delete('/api/admin/reviews/:id', authMiddleware, (req,res)=>{
  db.prepare('DELETE FROM reviews WHERE id=?').run(req.params.id);
  res.json({ ok:true });
});

// Admin: get stats (simple)
app.get('/api/admin/stats', authMiddleware, (req,res)=>{
  const products = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const reviews = db.prepare('SELECT COUNT(*) as c FROM reviews').get().c;
  res.json({ products, reviews });
});

/* --------- serve admin UI (static) --------- */
app.use('/admin', express.static(path.join(__dirname, 'admin')));

// Default fallback
app.get('*', (req,res) => {
  // if request is for API, 404
  if(req.path.startsWith('/api') || req.path.startsWith('/setup-admin')) return res.status(404).json({error:'not found'});
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT} (PORT=${PORT})`);
});
