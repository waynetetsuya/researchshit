const express = require('express');
const router = express.Router();

// In-memory store for testing; replace with DB logic if needed
let attendanceData = {
  room: '',
  checkIn: '',
  checkOut: '',
  status: ''
};

// POST from ESP32
router.post('/attendance', (req, res) => {
  const { room, checkIn, checkOut, status } = req.body;

  if (status === 'active') {
    attendanceData.room = room;
    attendanceData.checkIn = checkIn;
    attendanceData.status = status;
  } else if (status === 'inactive') {
    attendanceData.checkOut = checkOut;
    attendanceData.status = status;
  }

  console.log("✅ Attendance updated:", attendanceData);
  res.status(200).json({ message: 'Data received', data: attendanceData });
});

// GET for dashboard view
router.get('/attendance', (req, res) => {
  res.json(attendanceData);
});

module.exports = router;
