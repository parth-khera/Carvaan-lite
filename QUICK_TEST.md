# 🚀 Quick Test Guide

## Test All New Features in 5 Minutes

### 1️⃣ Test Gallery Upload Restriction

**As Core Committee/Admin:**
```
1. Login as admin/core-committee
2. Go to Gallery page
3. ✅ You should see "Upload Photo" button
4. Upload a photo - should work
```

**As Student:**
```
1. Login as student
2. Go to Gallery page
3. ✅ Upload button should be HIDDEN
4. Can view photos only
```

---

### 2️⃣ Test Camera QR Scanner

```
1. Login as student
2. Go to QR Scanner page
3. Click "Start Camera"
4. ✅ Camera should open with live preview
5. ✅ See scanning frame overlay
6. Point at QR code (or use manual entry)
7. ✅ Attendance marked successfully
```

**Troubleshooting:**
- Allow camera permissions in browser
- Use HTTPS or localhost (required for camera access)
- Try manual code entry if camera fails

---

### 3️⃣ Test Email Notifications

**Setup (One-time):**
```bash
# Create .env file
echo EMAIL_USER=your-email@gmail.com >> .env
echo EMAIL_PASS=your-app-password >> .env
```

**Test Flow:**
```
1. Register a teacher:
   - Email: teacher@example.com
   - Name: "Prof. Smith"
   - Role: teacher

2. Register a student:
   - Class Teacher: "Prof. Smith"
   - Roll Number: 2021001

3. Student marks attendance for an event

4. ✅ Check teacher@example.com inbox
   - Should receive email with student details
```

---

### 4️⃣ Test Portal Access Control

**HOD/Dean (Should Work):**
```
1. Register with role: "hod" or "dean"
2. ✅ Can login to portal
3. ✅ Full access to all features
```

**Regular Teacher (Should NOT Work):**
```
1. Register with role: "teacher"
2. ❌ Cannot login to portal
3. ✅ Receives welcome email
4. ✅ Gets notifications via email only
```

---

### 5️⃣ Test Teacher-Specific Reports

**As Teacher:**
```
1. Login as teacher (if portal access given)
2. Go to Reports page
3. Select an event
4. ✅ See only YOUR students (filtered by classTeacher)
5. Click "Email Report"
6. ✅ Receive email with student list
```

**As HOD/Admin:**
```
1. Login as HOD/admin
2. Go to Reports page
3. Select an event
4. ✅ See ALL students
5. Download CSV or email report
```

---

## Quick Commands

### Start Development Server
```bash
npm run dev
```

### Test Email Configuration
```bash
node -e "
require('dotenv').config();
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
transporter.verify((err, success) => {
  console.log(err || '✅ Email configured correctly!');
});
"
```

### Check Environment Variables
```bash
node -e "require('dotenv').config(); console.log('Email:', process.env.EMAIL_USER)"
```

---

## Expected Results

### ✅ Gallery
- Core committee: Can upload
- Students: Cannot upload
- All: Can view photos

### ✅ QR Scanner
- Camera opens with live preview
- Scanning frame visible
- Manual entry works as fallback

### ✅ Email
- Teachers receive attendance notifications
- HTML formatted emails
- Report emails work

### ✅ Portal Access
- HODs/Deans: Full access
- Teachers: No portal access
- Students: Full access

### ✅ Reports
- Teachers: See only their students
- HODs/Admins: See all students
- Email and CSV download work

---

## Troubleshooting

### Camera Not Working
```
- Use Chrome/Edge (best support)
- Enable camera permissions
- Use HTTPS or localhost
- Check browser console for errors
```

### Email Not Sending
```
- Verify .env file exists
- Check Gmail App Password
- Enable 2FA on Gmail
- Check spam folder
- See EMAIL_SETUP.md
```

### Upload Button Not Showing
```
- Check user role (must be core-committee or admin)
- Refresh page
- Check browser console
```

### Portal Access Denied
```
- Verify user role
- Teachers should NOT have portal access
- Only HOD/Dean/Admin/Core-committee/Student
```

---

## Test Data

### Sample Users:
```javascript
// Admin
{ email: "admin@college.edu", role: "admin" }

// Core Committee
{ email: "core@college.edu", role: "core-committee" }

// HOD
{ email: "hod@college.edu", role: "hod" }

// Teacher (No Portal)
{ email: "teacher@college.edu", role: "teacher", name: "Prof. Smith" }

// Student
{ 
  email: "student@college.edu", 
  role: "student",
  classTeacher: "Prof. Smith",
  rollNumber: "2021001"
}
```

---

## Success Criteria

- [ ] Gallery upload restricted to core members
- [ ] Camera QR scanner works with live preview
- [ ] Teachers receive email notifications
- [ ] Portal access controlled by role
- [ ] Teachers see only their students in reports
- [ ] Email reports work
- [ ] CSV download works
- [ ] All buttons respond correctly

---

**🎉 If all tests pass, you're ready to deploy!**

See `DEPLOYMENT.md` for deployment options.
