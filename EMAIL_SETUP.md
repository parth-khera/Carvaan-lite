# 📧 Email & WhatsApp Setup Guide

## Email Configuration (Gmail)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable "2-Step Verification"

### Step 2: Generate App Password
1. Go to [App Passwords](https://myaccount.google.com/apppasswords)
2. Select "Mail" and "Other (Custom name)"
3. Name it "Carvaan Connect"
4. Copy the 16-character password

### Step 3: Configure Environment Variables
Create `.env` file:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
```

### Step 4: Test Email
```bash
npm install
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password'
  }
});
transporter.sendMail({
  from: 'your-email@gmail.com',
  to: 'test@example.com',
  subject: 'Test Email',
  text: 'Email working!'
}, (err, info) => {
  console.log(err || 'Email sent!');
});
"
```

---

## WhatsApp Configuration (Twilio)

### Step 1: Create Twilio Account
1. Go to [Twilio](https://www.twilio.com/try-twilio)
2. Sign up for free trial
3. Get $15 free credit

### Step 2: Enable WhatsApp Sandbox
1. Go to [Twilio Console](https://console.twilio.com/)
2. Navigate to "Messaging" → "Try it out" → "Send a WhatsApp message"
3. Follow instructions to join sandbox

### Step 3: Get Credentials
1. Copy Account SID
2. Copy Auth Token
3. Copy WhatsApp number (e.g., `whatsapp:+14155238886`)

### Step 4: Configure Environment Variables
Add to `.env`:
```env
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Step 5: Update server.js
```javascript
const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendWhatsApp = async (phone, message) => {
  try {
    await twilioClient.messages.create({
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${phone}`,
      body: message
    });
    console.log('WhatsApp sent to:', phone);
  } catch (error) {
    console.error('WhatsApp error:', error.message);
  }
};
```

### Step 6: Install Twilio
```bash
npm install twilio
```

---

## Features Enabled

### ✅ For Teachers (Email/WhatsApp Only)
- Receive email when their students mark attendance
- Get WhatsApp notifications (if configured)
- Request attendance reports via email
- No portal access needed

### ✅ For HODs/Deans (Portal Access)
- Full portal access
- View all reports
- Manage events and users
- Email reports on demand

### ✅ For Students
- Mark attendance via QR code
- Camera scanning enabled
- Instant notifications

---

## Email Templates

### Student Attendance Notification
```html
<h2>Student Attendance Notification</h2>
<p><strong>Student:</strong> John Doe</p>
<p><strong>Roll Number:</strong> 2021001</p>
<p><strong>Department:</strong> Computer Science</p>
<p><strong>Event:</strong> Cultural Fest 2024</p>
<p><strong>Time:</strong> 2024-01-15 10:30 AM</p>
```

### Attendance Report
```html
<h2>Attendance Report - Cultural Fest 2024</h2>
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Roll Number</th>
      <th>Department</th>
      <th>Time</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <!-- Student rows -->
  </tbody>
</table>
```

---

## Testing

### Test Email Notification
1. Register a teacher with your email
2. Register a student with that teacher's name as classTeacher
3. Student marks attendance
4. Check your email inbox

### Test WhatsApp
1. Join Twilio WhatsApp sandbox
2. Add teacher phone number
3. Student marks attendance
4. Check WhatsApp messages

---

## Troubleshooting

### Email Not Sending
- ✅ Check Gmail app password is correct
- ✅ Verify 2FA is enabled
- ✅ Check spam folder
- ✅ Ensure EMAIL_USER and EMAIL_PASS are in .env

### WhatsApp Not Working
- ✅ Verify Twilio credentials
- ✅ Check phone number format: `+1234567890`
- ✅ Ensure recipient joined sandbox
- ✅ Check Twilio console for errors

---

## Production Deployment

### Email
- Use professional email service (SendGrid, AWS SES)
- Set up SPF/DKIM records
- Monitor sending limits

### WhatsApp
- Apply for Twilio WhatsApp Business API
- Get approved phone number
- Set up message templates

---

## Cost Estimates

### Email (Gmail)
- **Free**: Up to 500 emails/day
- **Google Workspace**: $6/user/month (unlimited)

### WhatsApp (Twilio)
- **Free Trial**: $15 credit
- **Production**: $0.005 per message
- **Monthly**: ~$5-20 depending on volume

---

**🎉 Your notification system is ready!**
