// routes/attendance.js
const express = require('express');
const router  = express.Router();
const pool    = require('../db'); // your pg-pool

// POST /api/attendance
// body: { mac, event, room, timestamp }
router.post('/', async (req, res) => {
  try {
    const { mac, event, room, timestamp } = req.body;
    // 1) find prof by MAC (you need a table/mac→prof mapping)
    const profRes = await pool.query(
      'SELECT id FROM users WHERE mac_address = $1',
      [mac]
    );
    if (!profRes.rows.length) {
      return res.status(404).send('Professor not found');
    }
    const profId = profRes.rows[0].id;

    if (event === 'checkin') {
      // update current status
      await pool.query(`
        INSERT INTO attendance_status (professor_id, room, status, updated_at)
        VALUES ($1,$2,'present',$3)
        ON CONFLICT (professor_id)
          DO UPDATE SET room=$2, status='present', updated_at=$3
      `, [profId, room, timestamp]);

      // log time_in
      await pool.query(`
        INSERT INTO attendance_logs (professor_id, room, time_in)
        VALUES ($1,$2,$3)
      `, [profId, room, timestamp]);

    } else if (event === 'checkout') {
      // update time_out on the last open log
      await pool.query(`
        UPDATE attendance_logs
           SET time_out = $3
         WHERE professor_id=$1
           AND room=$2
           AND time_out IS NULL
      `, [profId, room, timestamp]);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Attendance webhook error:', err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
