const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const QRCode = require('qrcode');
const http = require('http');
const socketIo = require('socket.io');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: process.env.NODE_ENV === 'production' ? false : 'http://localhost:3000', credentials: true }
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'carvaan-secret-key-2024';

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

// Send email notification
const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'Carvaan Connect <noreply@carvaan.com>',
      to,
      subject,
      html
    });
    console.log('Email sent to:', to);
  } catch (error) {
    console.error('Email error:', error.message);
  }
};

// Send WhatsApp notification (using WhatsApp Business API or Twilio)
const sendWhatsApp = async (phone, message) => {
  try {
    // Implement WhatsApp API integration here
    // Example: Using Twilio WhatsApp API
    console.log('WhatsApp to:', phone, 'Message:', message);
  } catch (error) {
    console.error('WhatsApp error:', error.message);
  }
};

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// File upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Data helpers
const dataDir = './data';
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const readData = (filename) => {
  const filePath = path.join(dataDir, filename);
  if (!fs.existsSync(filePath)) return [];
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const writeData = (filename, data) => {
  fs.writeFileSync(path.join(dataDir, filename), JSON.stringify(data, null, 2));
};

// Auth middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const roleMiddleware = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

const portalAccessMiddleware = (req, res, next) => {
  const allowedRoles = ['admin', 'core-committee', 'hod', 'dean', 'student'];
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Portal access restricted to HODs, Deans, and Core Committee only' });
  }
  next();
};

const coreMiddleware = (req, res, next) => {
  const users = readData('users.json');
  const user = users.find(u => u.id === req.user.id);
  if (user && (user.role === 'core-committee' || user.role === 'admin')) {
    next();
  } else {
    res.status(403).json({ error: 'Access denied - Core committee only' });
  }
};

// Socket.IO for real-time notifications
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-room', (userId) => {
    socket.join(userId);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const sendNotification = (userId, notification) => {
  io.to(userId).emit('notification', notification);
  const notifications = readData('notifications.json');
  notifications.push({ ...notification, userId, createdAt: new Date().toISOString() });
  writeData('notifications.json', notifications);
};

// Teacher registration (no portal access)
app.post('/api/auth/register-teacher', async (req, res) => {
  try {
    const { email, password, name, phone, department } = req.body;
    const users = readData('users.json');
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      role: 'teacher',
      phone: phone || '',
      department: department || '',
      portalAccess: false,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeData('users.json', users);
    
    // Send welcome email
    await sendEmail(
      email,
      'Welcome to Carvaan Connect - Teacher Notifications',
      `<h2>Welcome ${name}!</h2>
       <p>You have been registered as a teacher in Carvaan Connect.</p>
       <p>You will receive email and WhatsApp notifications when your students mark attendance.</p>
       <p>Note: You do not have portal access. Only HODs and Deans can access the portal.</p>`
    );
    
    res.json({ message: 'Teacher registered successfully. You will receive notifications via email.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'student', rollNumber, department, year, phone, designation, residence, position, section, course, classTeacher, classCoordinator, hod } = req.body;
    const users = readData('users.json');
    
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Email domain verification for college accounts
    const allowedDomains = ['edu', 'ac.in', 'college.edu'];
    const emailDomain = email.split('@')[1];
    const isVerifiedDomain = allowedDomains.some(domain => emailDomain?.includes(domain));
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      name,
      role,
      rollNumber: rollNumber || '',
      department: department || '',
      year: year || '',
      phone: phone || '',
      designation: designation || '',
      residence: residence || '',
      position: position || '',
      section: section || '',
      course: course || '',
      classTeacher: classTeacher || '',
      classCoordinator: classCoordinator || '',
      hod: hod || '',
      verified: isVerifiedDomain,
      createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeData('users.json', users);
    
    // Audit log
    const auditLogs = readData('audit-logs.json');
    auditLogs.push({
      id: uuidv4(),
      action: 'USER_REGISTERED',
      userId: newUser.id,
      userName: newUser.name,
      details: `New ${role} account created`,
      timestamp: new Date().toISOString()
    });
    writeData('audit-logs.json', auditLogs);
    
    const token = jwt.sign({ id: newUser.id, email, role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = readData('users.json');
    const user = users.find(u => u.email === email);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const users = readData('users.json');
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

app.put('/api/auth/profile', authMiddleware, async (req, res) => {
  try {
    const users = readData('users.json');
    const userIndex = users.findIndex(u => u.id === req.user.id);
    if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
    
    const { name, rollNumber, department, year, phone, designation, residence, position, section, course, classTeacher, classCoordinator, hod } = req.body;
    users[userIndex] = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      rollNumber: rollNumber || users[userIndex].rollNumber,
      department: department || users[userIndex].department,
      year: year || users[userIndex].year,
      phone: phone || users[userIndex].phone,
      designation: designation || users[userIndex].designation,
      residence: residence || users[userIndex].residence,
      position: position || users[userIndex].position,
      section: section || users[userIndex].section,
      course: course || users[userIndex].course,
      classTeacher: classTeacher || users[userIndex].classTeacher,
      classCoordinator: classCoordinator || users[userIndex].classCoordinator,
      hod: hod || users[userIndex].hod,
      updatedAt: new Date().toISOString()
    };
    
    writeData('users.json', users);
    const { password, ...userWithoutPassword } = users[userIndex];
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/profile/photo', authMiddleware, upload.single('photo'), (req, res) => {
  const users = readData('users.json');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  
  users[userIndex].photo = `/uploads/${req.file.filename}`;
  writeData('users.json', users);
  
  res.json({ message: 'Photo uploaded', photo: users[userIndex].photo });
});

// Events
app.get('/api/events', authMiddleware, (req, res) => {
  const events = readData('events.json');
  res.json(events);
});

app.post('/api/events', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee']), upload.single('image'), async (req, res) => {
  try {
    const events = readData('events.json');
    const eventId = uuidv4();
    
    // Generate QR code
    const qrData = JSON.stringify({ eventId, type: 'attendance' });
    const qrCode = await QRCode.toDataURL(qrData);
    const manualCode = qrData;
    
    const newEvent = {
      id: eventId,
      ...req.body,
      image: req.file ? `/uploads/${req.file.filename}` : null,
      qrCode,
      manualCode,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      attendees: [],
      status: 'pending'
    };
    
    events.push(newEvent);
    writeData('events.json', events);
    
    // Broadcast new event to all users
    io.emit('event-created', newEvent);
    
    // Notify all students
    const users = readData('users.json');
    users.filter(u => u.role === 'student').forEach(student => {
      sendNotification(student.id, {
        id: uuidv4(),
        type: 'new_event',
        title: 'New Event Created',
        message: `${newEvent.title} has been scheduled!`,
        eventId: newEvent.id
      });
    });
    
    res.json(newEvent);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/events/:id', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee']), (req, res) => {
  const events = readData('events.json');
  const index = events.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Event not found' });
  
  events[index] = { ...events[index], ...req.body, updatedAt: new Date().toISOString() };
  writeData('events.json', events);
  
  // Broadcast event update
  io.emit('event-updated', events[index]);
  
  res.json(events[index]);
});

app.delete('/api/events/:id', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee']), (req, res) => {
  const events = readData('events.json');
  const filtered = events.filter(e => e.id !== req.params.id);
  writeData('events.json', filtered);
  
  // Broadcast event deletion
  io.emit('event-deleted', { eventId: req.params.id });
  
  res.json({ message: 'Event deleted' });
});



// QR Attendance
app.post('/api/events/:id/attend', authMiddleware, (req, res) => {
  const events = readData('events.json');
  const eventIndex = events.findIndex(e => e.id === req.params.id);
  
  if (eventIndex === -1) return res.status(404).json({ error: 'Event not found' });
  
  const users = readData('users.json');
  const currentUser = users.find(u => u.id === req.user.id);
  
  const attendee = {
    id: req.user.id,
    name: currentUser?.name || req.user.email,
    rollNumber: currentUser?.rollNumber || '',
    department: currentUser?.department || '',
    classTeacher: currentUser?.classTeacher || '',
    timestamp: new Date().toISOString(),
    status: 'pending'
  };
  
  let xpGained = 0;
  if (!events[eventIndex].attendees.find(a => a.id === req.user.id)) {
    events[eventIndex].attendees.push(attendee);
    writeData('events.json', events);
    xpGained = 10;
    
    // Broadcast live update to all connected users
    io.emit('event-updated', {
      eventId: events[eventIndex].id,
      attendeeCount: events[eventIndex].attendees.length,
      newAttendee: attendee
    });
    
    // Notify faculty via socket
    const faculty = users.find(u => u.id === events[eventIndex].createdBy);
    if (faculty) {
      sendNotification(faculty.id, {
        id: uuidv4(),
        type: 'attendance_marked',
        title: 'New Attendance',
        message: `${attendee.name} marked attendance for ${events[eventIndex].title}`,
        eventId: events[eventIndex].id
      });
    }
    
    // Send email to class teacher
    if (currentUser.classTeacher) {
      const teacher = users.find(u => u.name === currentUser.classTeacher && u.role === 'teacher');
      if (teacher && teacher.email) {
        sendEmail(
          teacher.email,
          `Student Attendance - ${events[eventIndex].title}`,
          `<h2>Student Attendance Notification</h2>
           <p><strong>Student:</strong> ${currentUser.name}</p>
           <p><strong>Roll Number:</strong> ${currentUser.rollNumber}</p>
           <p><strong>Department:</strong> ${currentUser.department}</p>
           <p><strong>Event:</strong> ${events[eventIndex].title}</p>
           <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
           <p>This is an automated notification from Carvaan Connect.</p>`
        );
        
        if (teacher.phone) {
          sendWhatsApp(teacher.phone, `${currentUser.name} (${currentUser.rollNumber}) attended ${events[eventIndex].title}`);
        }
      }
    }
  }
  
  res.json({ message: 'Attendance marked successfully', xpGained });
});

app.get('/api/events/:id/code', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee']), (req, res) => {
  const events = readData('events.json');
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  
  const code = JSON.stringify({ eventId: event.id, type: 'attendance' });
  res.json({ code, eventId: event.id, eventTitle: event.title });
});

app.post('/api/events/:eventId/approve/:userId', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const events = readData('events.json');
  const event = events.find(e => e.id === req.params.eventId);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  
  const attendee = event.attendees.find(a => a.id === req.params.userId);
  if (!attendee) return res.status(404).json({ error: 'Attendee not found' });
  
  attendee.status = 'approved';
  writeData('events.json', events);
  
  sendNotification(req.params.userId, {
    id: uuidv4(),
    type: 'attendance_approved',
    title: 'Attendance Approved',
    message: `Your attendance for ${event.title} has been approved!`,
    eventId: event.id
  });
  
  res.json({ message: 'Attendance approved' });
});

// Clubs
app.get('/api/clubs', authMiddleware, (req, res) => {
  const clubs = readData('clubs.json');
  res.json(clubs);
});

app.post('/api/clubs', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee']), (req, res) => {
  const clubs = readData('clubs.json');
  const newClub = {
    id: uuidv4(),
    ...req.body,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    members: []
  };
  clubs.push(newClub);
  writeData('clubs.json', clubs);
  res.json(newClub);
});

app.post('/api/clubs/:id/join', authMiddleware, (req, res) => {
  const clubs = readData('clubs.json');
  const club = clubs.find(c => c.id === req.params.id);
  if (!club) return res.status(404).json({ error: 'Club not found' });
  
  if (!club.members.find(m => m.id === req.user.id)) {
    club.members.push({ id: req.user.id, name: req.body.name, joinedAt: new Date().toISOString() });
    writeData('clubs.json', clubs);
  }
  
  res.json({ message: 'Joined club successfully' });
});

// Core Members
app.get('/api/core-members', authMiddleware, (req, res) => {
  const users = readData('users.json');
  const coreMembers = users
    .filter(u => u.role === 'core-committee' || u.role === 'admin')
    .map(u => ({
      id: u.id,
      name: u.name,
      position: u.position || 'Core Member',
      department: u.department || '',
      photo: u.photo || null,
      email: u.email
    }));
  res.json(coreMembers);
});

app.post('/api/core-members/:id/photo', authMiddleware, roleMiddleware(['admin']), upload.single('photo'), (req, res) => {
  const users = readData('users.json');
  const userIndex = users.findIndex(u => u.id === req.params.id);
  
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  
  users[userIndex].photo = `/uploads/${req.file.filename}`;
  writeData('users.json', users);
  
  res.json({ message: 'Photo updated', photo: users[userIndex].photo });
});

app.get('/api/users/core-members', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const users = readData('users.json');
  const coreMembers = users.filter(u => u.role === 'core-committee' || u.role === 'admin');
  res.json(coreMembers.map(u => ({ id: u.id, name: u.name, photo: u.photo, position: u.position })));
});

// Gallery
app.get('/api/gallery', authMiddleware, portalAccessMiddleware, (req, res) => {
  const photos = readData('gallery.json');
  res.json(photos);
});

app.post('/api/gallery', authMiddleware, roleMiddleware(['core-committee', 'admin']), upload.single('photo'), (req, res) => {
  const photos = readData('gallery.json');
  const newPhoto = {
    id: uuidv4(),
    url: `/uploads/${req.file.filename}`,
    caption: req.body.caption || '',
    uploadedBy: req.user.id,
    uploadedByName: req.body.uploadedByName,
    eventId: req.body.eventId,
    likes: [],
    createdAt: new Date().toISOString()
  };
  photos.push(newPhoto);
  writeData('gallery.json', photos);
  res.json(newPhoto);
});

app.post('/api/gallery/:id/like', authMiddleware, (req, res) => {
  const photos = readData('gallery.json');
  const photo = photos.find(p => p.id === req.params.id);
  
  if (!photo) return res.status(404).json({ error: 'Photo not found' });
  
  if (!photo.likes) photo.likes = [];
  
  const likeIndex = photo.likes.indexOf(req.user.id);
  if (likeIndex > -1) {
    photo.likes.splice(likeIndex, 1);
  } else {
    photo.likes.push(req.user.id);
  }
  
  writeData('gallery.json', photos);
  res.json({ likes: photo.likes.length, liked: likeIndex === -1 });
});

// Notifications
app.get('/api/notifications', authMiddleware, (req, res) => {
  const notifications = readData('notifications.json');
  const userNotifications = notifications.filter(n => n.userId === req.user.id);
  res.json(userNotifications);
});

app.put('/api/notifications/:id/read', authMiddleware, (req, res) => {
  const notifications = readData('notifications.json');
  const notification = notifications.find(n => n.id === req.params.id);
  if (notification) {
    notification.read = true;
    writeData('notifications.json', notifications);
  }
  res.json({ message: 'Notification marked as read' });
});

// Dashboard Stats
app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const events = readData('events.json');
  const clubs = readData('clubs.json');
  const users = readData('users.json');
  const sessions = readData('practice-sessions.json');
  
  if (req.user.role === 'student') {
    const myAttendance = events.filter(e => e.attendees.some(a => a.id === req.user.id));
    const myClubs = clubs.filter(c => c.members.some(m => m.id === req.user.id));
    const myPractice = sessions.filter(s => s.attendance.some(a => a.id === req.user.id));
    
    const xp = (myAttendance.length * 10) + (myClubs.length * 20) + (myPractice.length * 5);
    const level = Math.floor(xp / 50) + 1;
    
    res.json({
      eventsAttended: myAttendance.length,
      clubsJoined: myClubs.length,
      practiceAttended: myPractice.length,
      upcomingEvents: events.filter(e => new Date(e.date) > new Date()).length,
      recentActivity: myAttendance.slice(-5),
      xp,
      level,
      nextLevelXP: level * 50
    });
  } else if (req.user.role === 'faculty' || req.user.role === 'core-committee') {
    const myEvents = events.filter(e => e.createdBy === req.user.id);
    const totalAttendance = myEvents.reduce((sum, e) => sum + e.attendees.length, 0);
    
    const attendanceByMonth = myEvents.reduce((acc, event) => {
      const month = new Date(event.date).toLocaleString('default', { month: 'short' });
      acc[month] = (acc[month] || 0) + event.attendees.length;
      return acc;
    }, {});
    
    res.json({
      eventsCreated: myEvents.length,
      totalAttendance,
      pendingApprovals: myEvents.reduce((sum, e) => sum + e.attendees.filter(a => a.status === 'pending').length, 0),
      recentEvents: myEvents.slice(-5),
      attendanceByMonth
    });
  } else {
    res.json({
      totalUsers: users.length,
      totalEvents: events.length,
      totalClubs: clubs.length,
      totalAttendance: events.reduce((sum, e) => sum + e.attendees.length, 0)
    });
  }
});

// Reports - Core committee and faculty can see all, teachers see only their students
app.get('/api/reports/attendance/:eventId', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee', 'teacher', 'hod', 'dean']), (req, res) => {
  const events = readData('events.json');
  const users = readData('users.json');
  const event = events.find(e => e.id === req.params.eventId);
  
  if (!event) return res.status(404).json({ error: 'Event not found' });
  
  const currentUser = users.find(u => u.id === req.user.id);
  let attendees = event.attendees;
  
  // Only regular teachers see filtered students, core committee and faculty see all
  if (req.user.role === 'teacher' && req.user.role !== 'core-committee' && req.user.role !== 'faculty') {
    attendees = event.attendees.filter(a => a.classTeacher === currentUser.name);
  }
  
  res.json({
    eventName: event.title,
    totalAttendees: attendees.length,
    approved: attendees.filter(a => a.status === 'approved').length,
    pending: attendees.filter(a => a.status === 'pending').length,
    attendees: attendees,
    generatedAt: new Date().toISOString()
  });
});

// Email attendance report
app.post('/api/reports/email/:eventId', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee', 'teacher', 'hod', 'dean']), async (req, res) => {
  const events = readData('events.json');
  const users = readData('users.json');
  const event = events.find(e => e.id === req.params.eventId);
  
  if (!event) return res.status(404).json({ error: 'Event not found' });
  
  const currentUser = users.find(u => u.id === req.user.id);
  let attendees = event.attendees;
  
  // Only regular teachers get filtered data
  if (req.user.role === 'teacher' && req.user.role !== 'core-committee' && req.user.role !== 'faculty') {
    attendees = event.attendees.filter(a => a.classTeacher === currentUser.name);
  }
  
  // Generate HTML table
  const tableRows = attendees.map(a => 
    `<tr>
      <td style="border: 1px solid #ddd; padding: 8px;">${a.name}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${a.rollNumber || 'N/A'}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${a.department || 'N/A'}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${new Date(a.timestamp).toLocaleString()}</td>
      <td style="border: 1px solid #ddd; padding: 8px;">${a.status}</td>
    </tr>`
  ).join('');
  
  const emailHTML = `
    <h2>Attendance Report - ${event.title}</h2>
    <p><strong>Event Date:</strong> ${event.date}</p>
    <p><strong>Total Attendees:</strong> ${attendees.length}</p>
    <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
      <thead>
        <tr style="background-color: #8B1538; color: white;">
          <th style="border: 1px solid #ddd; padding: 8px;">Name</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Roll Number</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Department</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Time</th>
          <th style="border: 1px solid #ddd; padding: 8px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    <p style="margin-top: 20px; color: #666;">Generated by Carvaan Connect</p>
  `;
  
  await sendEmail(currentUser.email, `Attendance Report - ${event.title}`, emailHTML);
  
  res.json({ message: 'Report sent to your email' });
});

// Core Committee - User Management
app.get('/api/admin/users', authMiddleware, coreMiddleware, (req, res) => {
  const users = readData('users.json');
  res.json(users.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, department: u.department, position: u.position, createdAt: u.createdAt })));
});

app.put('/api/admin/users/:id', authMiddleware, coreMiddleware, (req, res) => {
  const users = readData('users.json');
  const userIndex = users.findIndex(u => u.id === req.params.id);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  
  const { name, role, department, rollNumber, year, phone, designation, residence, position, section, course, classTeacher, classCoordinator, hod } = req.body;
  users[userIndex] = {
    ...users[userIndex],
    name: name || users[userIndex].name,
    role: role || users[userIndex].role,
    department: department || users[userIndex].department,
    rollNumber: rollNumber || users[userIndex].rollNumber,
    year: year || users[userIndex].year,
    phone: phone || users[userIndex].phone,
    designation: designation || users[userIndex].designation,
    residence: residence || users[userIndex].residence,
    position: position || users[userIndex].position,
    section: section || users[userIndex].section,
    course: course || users[userIndex].course,
    classTeacher: classTeacher || users[userIndex].classTeacher,
    classCoordinator: classCoordinator || users[userIndex].classCoordinator,
    hod: hod || users[userIndex].hod,
    updatedAt: new Date().toISOString()
  };
  
  writeData('users.json', users);
  res.json({ message: 'User updated successfully' });
});

app.delete('/api/admin/users/:id', authMiddleware, coreMiddleware, (req, res) => {
  const users = readData('users.json');
  const filtered = users.filter(u => u.id !== req.params.id);
  writeData('users.json', filtered);
  res.json({ message: 'User deleted successfully' });
});

// Practice Attendance
app.post('/api/practice/sessions', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee']), (req, res) => {
  const sessions = readData('practice-sessions.json');
  const newSession = {
    id: uuidv4(),
    ...req.body,
    createdBy: req.user.id,
    createdAt: new Date().toISOString(),
    attendance: [],
    status: 'scheduled'
  };
  sessions.push(newSession);
  writeData('practice-sessions.json', sessions);
  
  // Notify students
  const users = readData('users.json');
  users.filter(u => u.role === 'student' && u.classTeacher === req.body.teacherName).forEach(student => {
    sendNotification(student.id, {
      id: uuidv4(),
      type: 'practice_scheduled',
      title: 'Practice Session Scheduled',
      message: `Practice session on ${req.body.date} at ${req.body.time}`,
      sessionId: newSession.id
    });
  });
  
  res.json(newSession);
});

app.get('/api/practice/sessions', authMiddleware, (req, res) => {
  const sessions = readData('practice-sessions.json');
  const users = readData('users.json');
  const currentUser = users.find(u => u.id === req.user.id);
  
  let filteredSessions = sessions;
  if (req.user.role === 'student') {
    filteredSessions = sessions.filter(s => s.teacherName === currentUser.classTeacher);
  } else if (req.user.role === 'faculty') {
    filteredSessions = sessions.filter(s => s.createdBy === req.user.id);
  }
  
  res.json(filteredSessions);
});

app.post('/api/practice/sessions/:id/attend', authMiddleware, (req, res) => {
  const sessions = readData('practice-sessions.json');
  const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
  
  if (sessionIndex === -1) return res.status(404).json({ error: 'Session not found' });
  
  const users = readData('users.json');
  const currentUser = users.find(u => u.id === req.user.id);
  
  const attendance = {
    id: req.user.id,
    name: currentUser.name,
    rollNumber: currentUser.rollNumber,
    timestamp: new Date().toISOString()
  };
  
  if (!sessions[sessionIndex].attendance.find(a => a.id === req.user.id)) {
    sessions[sessionIndex].attendance.push(attendance);
    writeData('practice-sessions.json', sessions);
    
    // Notify teacher
    const teacher = users.find(u => u.id === sessions[sessionIndex].createdBy);
    if (teacher) {
      sendNotification(teacher.id, {
        id: uuidv4(),
        type: 'practice_attendance',
        title: 'Student Marked Attendance',
        message: `${currentUser.name} marked attendance for practice session`,
        sessionId: sessions[sessionIndex].id
      });
    }
  }
  
  res.json({ message: 'Attendance marked successfully' });
});

app.put('/api/practice/sessions/:id/status', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee']), (req, res) => {
  const sessions = readData('practice-sessions.json');
  const sessionIndex = sessions.findIndex(s => s.id === req.params.id);
  
  if (sessionIndex === -1) return res.status(404).json({ error: 'Session not found' });
  
  sessions[sessionIndex].status = req.body.status;
  sessions[sessionIndex].updatedAt = new Date().toISOString();
  writeData('practice-sessions.json', sessions);
  
  // Send report to teacher
  if (req.body.status === 'completed') {
    const users = readData('users.json');
    const teacher = users.find(u => u.id === sessions[sessionIndex].createdBy);
    if (teacher) {
      sendNotification(teacher.id, {
        id: uuidv4(),
        type: 'practice_report',
        title: 'Practice Session Completed',
        message: `${sessions[sessionIndex].attendance.length} students attended the practice session`,
        sessionId: sessions[sessionIndex].id
      });
    }
  }
  
  res.json({ message: 'Session status updated' });
});

app.get('/api/practice/report/:sessionId', authMiddleware, roleMiddleware(['faculty', 'admin', 'core-committee']), (req, res) => {
  const sessions = readData('practice-sessions.json');
  const session = sessions.find(s => s.id === req.params.sessionId);
  
  if (!session) return res.status(404).json({ error: 'Session not found' });
  
  res.json({
    sessionDate: session.date,
    sessionTime: session.time,
    totalAttendance: session.attendance.length,
    attendance: session.attendance,
    status: session.status,
    generatedAt: new Date().toISOString()
  });
});

// Announcements
app.get('/api/announcements', authMiddleware, (req, res) => {
  const announcements = readData('announcements.json');
  res.json(announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.post('/api/announcements', authMiddleware, coreMiddleware, (req, res) => {
  const announcements = readData('announcements.json');
  const users = readData('users.json');
  const currentUser = users.find(u => u.id === req.user.id);
  
  const newAnnouncement = {
    id: uuidv4(),
    title: req.body.title,
    content: req.body.content,
    priority: req.body.priority || 'normal',
    createdBy: req.user.id,
    createdByName: currentUser.name,
    createdAt: new Date().toISOString()
  };
  
  announcements.push(newAnnouncement);
  writeData('announcements.json', announcements);
  
  // Notify all users
  users.forEach(user => {
    sendNotification(user.id, {
      id: uuidv4(),
      type: 'announcement',
      title: 'New Announcement',
      message: req.body.title,
      announcementId: newAnnouncement.id
    });
  });
  
  res.json(newAnnouncement);
});

app.put('/api/announcements/:id', authMiddleware, coreMiddleware, (req, res) => {
  const announcements = readData('announcements.json');
  const index = announcements.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Announcement not found' });
  
  announcements[index] = {
    ...announcements[index],
    title: req.body.title || announcements[index].title,
    content: req.body.content || announcements[index].content,
    priority: req.body.priority || announcements[index].priority,
    updatedAt: new Date().toISOString()
  };
  
  writeData('announcements.json', announcements);
  res.json(announcements[index]);
});

app.delete('/api/announcements/:id', authMiddleware, coreMiddleware, (req, res) => {
  const announcements = readData('announcements.json');
  const announcement = announcements.find(a => a.id === req.params.id);
  const filtered = announcements.filter(a => a.id !== req.params.id);
  writeData('announcements.json', filtered);
  
  // Audit log
  const auditLogs = readData('audit-logs.json');
  auditLogs.push({
    id: uuidv4(),
    action: 'ANNOUNCEMENT_DELETED',
    userId: req.user.id,
    details: `Deleted announcement: ${announcement?.title}`,
    timestamp: new Date().toISOString()
  });
  writeData('audit-logs.json', auditLogs);
  
  res.json({ message: 'Announcement deleted' });
});

// Role Escalation Requests
app.post('/api/role-requests', authMiddleware, (req, res) => {
  const requests = readData('role-requests.json');
  const users = readData('users.json');
  const currentUser = users.find(u => u.id === req.user.id);
  
  const newRequest = {
    id: uuidv4(),
    userId: req.user.id,
    userName: currentUser.name,
    currentRole: currentUser.role,
    requestedRole: req.body.requestedRole,
    reason: req.body.reason,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  
  requests.push(newRequest);
  writeData('role-requests.json', requests);
  
  // Notify admins
  users.filter(u => u.role === 'admin').forEach(admin => {
    sendNotification(admin.id, {
      id: uuidv4(),
      type: 'role_request',
      title: 'New Role Request',
      message: `${currentUser.name} requested ${req.body.requestedRole} role`,
      requestId: newRequest.id
    });
  });
  
  res.json(newRequest);
});

app.get('/api/role-requests', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const requests = readData('role-requests.json');
  res.json(requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

app.put('/api/role-requests/:id', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const requests = readData('role-requests.json');
  const users = readData('users.json');
  const requestIndex = requests.findIndex(r => r.id === req.params.id);
  
  if (requestIndex === -1) return res.status(404).json({ error: 'Request not found' });
  
  requests[requestIndex].status = req.body.status;
  requests[requestIndex].reviewedBy = req.user.id;
  requests[requestIndex].reviewedAt = new Date().toISOString();
  
  if (req.body.status === 'approved') {
    const userIndex = users.findIndex(u => u.id === requests[requestIndex].userId);
    if (userIndex !== -1) {
      users[userIndex].role = requests[requestIndex].requestedRole;
      writeData('users.json', users);
      
      sendNotification(requests[requestIndex].userId, {
        id: uuidv4(),
        type: 'role_approved',
        title: 'Role Request Approved',
        message: `You are now a ${requests[requestIndex].requestedRole}`,
        requestId: requests[requestIndex].id
      });
    }
  }
  
  writeData('role-requests.json', requests);
  
  // Audit log
  const auditLogs = readData('audit-logs.json');
  auditLogs.push({
    id: uuidv4(),
    action: 'ROLE_REQUEST_REVIEWED',
    userId: req.user.id,
    details: `${req.body.status} role request for ${requests[requestIndex].userName}`,
    timestamp: new Date().toISOString()
  });
  writeData('audit-logs.json', auditLogs);
  
  res.json(requests[requestIndex]);
});

// Audit Logs
app.get('/api/audit-logs', authMiddleware, roleMiddleware(['admin']), (req, res) => {
  const logs = readData('audit-logs.json');
  res.json(logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 100));
});

// Color Themes
app.get('/api/themes', (req, res) => {
  const themes = [
    { id: 'maroon', name: 'Classic Maroon', primary: '#8B1538', secondary: '#FFD700' },
    { id: 'blue', name: 'Ocean Blue', primary: '#1E40AF', secondary: '#60A5FA' },
    { id: 'green', name: 'Forest Green', primary: '#065F46', secondary: '#34D399' },
    { id: 'purple', name: 'Royal Purple', primary: '#6B21A8', secondary: '#C084FC' },
    { id: 'orange', name: 'Sunset Orange', primary: '#C2410C', secondary: '#FB923C' }
  ];
  res.json(themes);
});

app.post('/api/user/theme', authMiddleware, (req, res) => {
  const users = readData('users.json');
  const userIndex = users.findIndex(u => u.id === req.user.id);
  
  if (userIndex === -1) return res.status(404).json({ error: 'User not found' });
  
  users[userIndex].theme = req.body.theme;
  writeData('users.json', users);
  
  res.json({ message: 'Theme updated', theme: req.body.theme });
});

// Initialize data files
if (!fs.existsSync(path.join(dataDir, 'audit-logs.json'))) writeData('audit-logs.json', []);
if (!fs.existsSync(path.join(dataDir, 'role-requests.json'))) writeData('role-requests.json', []);

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

server.listen(PORT, () => {
  console.log(`🎭 Carvaan Connect server running on port ${PORT}`);
});