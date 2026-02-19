# 🗄️ MongoDB Database Setup

## ✅ Secure Database Implementation

Replaced JSON file storage with MongoDB for secure, scalable data management.

---

## 🚀 Quick Setup

### Option 1: Local MongoDB (Recommended for Development)

1. **Install MongoDB:**
   - Windows: Download from [mongodb.com](https://www.mongodb.com/try/download/community)
   - Mac: `brew install mongodb-community`
   - Linux: `sudo apt-get install mongodb`

2. **Start MongoDB:**
   ```bash
   # Windows
   mongod

   # Mac/Linux
   brew services start mongodb-community
   # or
   sudo systemctl start mongod
   ```

3. **Install Dependencies:**
   ```bash
   npm install
   ```

4. **Start Application:**
   ```bash
   npm run dev
   ```

---

### Option 2: MongoDB Atlas (Cloud - Free Tier)

1. **Create Account:**
   - Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
   - Sign up for free

2. **Create Cluster:**
   - Click "Build a Database"
   - Select "Free" tier
   - Choose region closest to you
   - Click "Create"

3. **Get Connection String:**
   - Click "Connect"
   - Select "Connect your application"
   - Copy connection string

4. **Configure Environment:**
   ```bash
   # Create .env file
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/carvaan-connect
   ```

5. **Start Application:**
   ```bash
   npm install
   npm run dev
   ```

---

## 📊 Database Models

### User Model
```javascript
{
  email: String (unique, required),
  password: String (hashed, required),
  name: String (required),
  role: String (enum),
  rollNumber: String,
  department: String,
  photo: String,
  theme: String,
  createdAt: Date
}
```

### Event Model
```javascript
{
  title: String (required),
  description: String,
  date: String,
  location: String,
  qrCode: String,
  createdBy: ObjectId (ref: User),
  attendees: [{
    userId: ObjectId,
    name: String,
    status: String,
    timestamp: Date
  }],
  createdAt: Date
}
```

### Club Model
```javascript
{
  name: String (required),
  description: String,
  category: String,
  createdBy: ObjectId (ref: User),
  members: [{
    userId: ObjectId,
    name: String,
    joinedAt: Date
  }]
}
```

### Gallery Model
```javascript
{
  url: String (required),
  caption: String,
  uploadedBy: ObjectId (ref: User),
  eventId: ObjectId (ref: Event),
  likes: [ObjectId],
  createdAt: Date
}
```

### Notification Model
```javascript
{
  userId: ObjectId (ref: User),
  type: String,
  title: String,
  message: String,
  eventId: ObjectId,
  read: Boolean,
  createdAt: Date
}
```

---

## 🔒 Security Features

### Password Security
- ✅ Bcrypt hashing (10 rounds)
- ✅ Never stored in plain text
- ✅ Secure comparison

### Data Validation
- ✅ Mongoose schema validation
- ✅ Required fields enforced
- ✅ Type checking
- ✅ Unique constraints

### Connection Security
- ✅ Environment variables
- ✅ Connection pooling
- ✅ Error handling
- ✅ Automatic reconnection

---

## 📁 Project Structure

```
carvaanlite/
├── models/
│   ├── User.js
│   ├── Event.js
│   ├── Club.js
│   ├── Gallery.js
│   └── Notification.js
├── config/
│   └── database.js
├── server.js
└── .env
```

---

## 🔧 Environment Variables

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/carvaan-connect

# Or for MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/carvaan-connect

# Other configs
JWT_SECRET=your-secret-key
PORT=5000
```

---

## 🧪 Testing Database

### Check Connection:
```bash
# Start server
npm run dev

# Look for:
✅ MongoDB Connected: localhost
```

### Test Operations:
```bash
# Register a user
POST http://localhost:5000/api/auth/register

# Check MongoDB
mongo
use carvaan-connect
db.users.find()
```

---

## 📊 Database Commands

### MongoDB Shell:
```bash
# Connect
mongo

# Use database
use carvaan-connect

# View collections
show collections

# View users
db.users.find().pretty()

# Count documents
db.users.countDocuments()

# Delete all (careful!)
db.users.deleteMany({})
```

---

## 🚀 Migration from JSON

Data automatically migrates on first run. Old JSON files kept as backup in `data/` folder.

---

## 💾 Backup & Restore

### Backup:
```bash
mongodump --db carvaan-connect --out ./backup
```

### Restore:
```bash
mongorestore --db carvaan-connect ./backup/carvaan-connect
```

---

## 🌐 MongoDB Atlas Setup (Detailed)

1. **Create Cluster** (5 minutes)
2. **Create Database User**
   - Database Access → Add New User
   - Username: `carvaan-admin`
   - Password: Generate secure password
3. **Whitelist IP**
   - Network Access → Add IP Address
   - Allow Access from Anywhere: `0.0.0.0/0`
4. **Get Connection String**
   - Clusters → Connect → Connect Application
   - Copy string
5. **Update .env**
   ```
   MONGODB_URI=
   ```

---

## 🔍 Monitoring

### MongoDB Compass (GUI):
- Download: [mongodb.com/products/compass](https://www.mongodb.com/products/compass)
- Connect with URI
- Visual database management

### Atlas Dashboard:
- Real-time metrics
- Query performance
- Storage usage
- Connection monitoring

---

## ⚡ Performance

### Indexes Created:
- `email` (unique)
- `createdAt`
- `userId` (for queries)

### Connection Pooling:
- Automatic by Mongoose
- Reuses connections
- Reduces overhead

---

## 🐛 Troubleshooting

### Connection Failed?
```bash
# Check MongoDB is running
mongod --version

# Check port
netstat -an | findstr 27017

# Restart MongoDB
brew services restart mongodb-community
```

### Authentication Error?
- Check username/password
- Verify IP whitelist
- Check connection string format

### Slow Queries?
- Add indexes
- Use MongoDB Compass
- Check Atlas performance

---

## 📈 Scaling

### Free Tier Limits:
- 512 MB storage
- Shared RAM
- Unlimited connections

### Upgrade Options:
- M10: $0.08/hour (~$57/month)
- M20: $0.20/hour (~$144/month)
- Auto-scaling available

---

## ✅ Benefits Over JSON

| Feature | JSON Files | MongoDB |
|---------|-----------|---------|
| Security | ❌ Plain text | ✅ Encrypted |
| Scalability | ❌ Limited | ✅ Unlimited |
| Concurrent Access | ❌ File locks | ✅ Multi-user |
| Queries | ❌ Manual | ✅ Optimized |
| Backup | ❌ Manual | ✅ Automatic |
| Relationships | ❌ None | ✅ References |
| Validation | ❌ None | ✅ Schema |

---

**🎉 Secure database ready! Your data is now protected!** 🔒
