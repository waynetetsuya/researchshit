// server.js
const express    = require('express');
const session    = require('express-session');
const bodyParser = require('body-parser');
const path       = require('path');
const flash      = require('express-flash');
const http       = require('http');
const socketIo   = require('socket.io');
const admin      = require('firebase-admin');

const authRoutes  = require('./routes/auth');
const hrRoutes    = require('./routes/humanresource');
const deanRoutes  = require('./routes/dean');
const profRoutes  = require('./routes/prof');

require('dotenv').config();
const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});
const db = admin.database();

const app    = express();
const server = http.createServer(app);
const io     = socketIo(server);

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname,'public')));
app.use(session({ secret:'yourSecretKey', resave:false, saveUninitialized:true }));
app.use(flash());
app.set('view engine','ejs');
app.set('views', path.join(__dirname,'views'));
app.use(bodyParser.urlencoded({ extended:true }));
app.use(express.json());

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.get('/',            (req, res) => res.redirect('/login'));
app.use('/',            authRoutes);
app.use('/hr',          hrRoutes);
app.use('/dean',        deanRoutes);
app.use('/professor',   profRoutes);

// ── RSSI RECEIVER (HTTP POST from ESP) ───────────────────────────────────────
app.post('/api/rssi', (req, res) => {
  const { raw, filtered, distance, state } = req.body;
  console.log('📡 Received BLE Data via HTTP:', req.body);
  io.emit('rssiUpdate', { raw, filtered, distance, state });
  res.json({ message:'ok' });
});

// ── FIREBASE → SOCKET.IO: RSSI ────────────────────────────────────────────────
const rssiRef = db.ref('/rssi');
console.log('👂 Attaching “every new child” RSSI listener on /rssi');

// first do a one-time read so we ignore all existing children
rssiRef.once('value')
  .then(() => {
    // now attach real listener for brand-new entries
    rssiRef.on('child_added', snap => {
      const data = snap.val();
      console.log('📡 New BLE Data from Firebase:', data);
      io.emit('rssiUpdate', data);
    });
  })
  .catch(err => {
    console.error('❌ Error reading initial /rssi snapshot:', err);
  });

// ── AUTO-PRUNE OLD RSSI READINGS ─────────────────────────────────────────────
const PRUNE_INTERVAL_MS = 30 * 1000;  // every 30s
const MAX_ENTRIES       = 25;         // keep only last 25 readings

async function pruneOldRssi() {
  try {
    const snap = await rssiRef.orderByKey().once('value');
    const all  = snap.val() || {};
    const keys = Object.keys(all).sort((a,b)=>Number(a)-Number(b));
    if (keys.length > MAX_ENTRIES) {
      const toDelete = keys.slice(0, keys.length - MAX_ENTRIES);
      toDelete.forEach(key => rssiRef.child(key).remove());
      console.log(`🧹 Pruned ${toDelete.length} old RSSI entries`);
    } else {
      console.log(`✅ ${keys.length} RSSI entries, no prune needed`);
    }
  } catch (err) {
    console.error('⚠️ Error pruning RSSI entries:', err);
  }
}
setInterval(pruneOldRssi, PRUNE_INTERVAL_MS);
pruneOldRssi();  // run once at startup

// ── FIREBASE → SOCKET.IO: ATTENDANCE ────────────────────────────────────────
db.ref('/attendance')
  .on('child_added', macSnap => {
    const macRef = macSnap.ref;
    macRef.on('child_added', evtSnap => {
      const { event, timestamp } = evtSnap.val();
      console.log(`🕒 Attendance ${event} @ ${timestamp}`);
      io.emit('attendanceUpdate', { event, timestamp });
    });
    macRef.on('child_changed', evtSnap => {
      const { event, timestamp } = evtSnap.val();
      console.log(`🕒 Attendance updated ${event} @ ${timestamp}`);
      io.emit('attendanceUpdate', { event, timestamp });
    });
  });

// ── FLAT TODAY’S HISTORY ENDPOINT ────────────────────────────────────────────
app.get('/api/attendance/history', async (req, res) => {
  const snap = await db.ref('/attendance').once('value');
  const raw  = snap.val() || {};
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  // gather every event across all MACs
  const allEvents = [];
  Object.values(raw).forEach(macNode =>
    Object.values(macNode).forEach(evt =>
      allEvents.push({ event: evt.event, timestamp: evt.timestamp })
    )
  );

  // filter to today + sort
  const todays = allEvents
    .filter(({ timestamp }) => {
      const d = new Date(timestamp);
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` === todayKey;
    })
    .sort((a,b)=>a.timestamp - b.timestamp);

  res.json(todays);
});

// ── SOCKET.IO CONNECTION ─────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log('🔌 New client connected');
  socket.on('disconnect', () =>
    console.log('❌ Client disconnected')
  );
});

// ── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
