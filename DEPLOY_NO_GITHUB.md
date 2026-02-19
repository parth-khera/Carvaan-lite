# 🚀 Deploy Without GitHub

## Option 1: Render (Direct Upload)

1. **Build locally:**
   ```bash
   npm install
   cd client && npm install && npm run build
   cd ..
   ```

2. Go to [render.com](https://render.com) → Sign up

3. Click "New +" → "Web Service" → "Deploy an existing image from a registry" → Skip

4. Choose "Public Git repository" → Enter: `https://github.com/render-examples/express-hello-world`

5. After creation, go to "Settings" → "Build & Deploy" → "Manual Deploy"

6. Upload your code via Render CLI:
   ```bash
   npm install -g render-cli
   render login
   render deploy
   ```

---

## Option 2: Railway (CLI Upload)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login & Deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Add environment variables:**
   ```bash
   railway variables set JWT_SECRET=your-secret-key
   railway variables set NODE_ENV=production
   ```

4. Done! Railway gives you a live URL.

---

## Option 3: Vercel (CLI - Easiest)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Build frontend:**
   ```bash
   cd client && npm run build && cd ..
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. Follow prompts, Vercel deploys automatically!

---

## Option 4: Heroku (CLI)

1. **Install Heroku CLI:** [Download here](https://devcenter.heroku.com/articles/heroku-cli)

2. **Login & Create App:**
   ```bash
   heroku login
   heroku create carvaan-connect
   ```

3. **Deploy:**
   ```bash
   git init
   git add .
   git commit -m "Deploy"
   heroku git:remote -a carvaan-connect
   git push heroku main
   ```

4. **Set environment:**
   ```bash
   heroku config:set JWT_SECRET=your-secret-key
   heroku config:set NODE_ENV=production
   ```

---

## Option 5: DigitalOcean App Platform (Upload ZIP)

1. Go to [DigitalOcean](https://cloud.digitalocean.com/apps)

2. Click "Create App" → "Upload Source Code"

3. **Zip your project:**
   ```bash
   # Exclude node_modules
   zip -r carvaan.zip . -x "node_modules/*" "client/node_modules/*"
   ```

4. Upload ZIP file

5. Configure:
   - Build: `npm install && cd client && npm install && npm run build`
   - Run: `node server.js`
   - Add env: `JWT_SECRET`

---

## Option 6: AWS Elastic Beanstalk (ZIP Upload)

1. Go to [AWS Console](https://console.aws.amazon.com/elasticbeanstalk)

2. Create new application → Node.js platform

3. **Create ZIP:**
   ```bash
   zip -r deploy.zip . -x "node_modules/*" "client/node_modules/*" ".git/*"
   ```

4. Upload ZIP → Configure environment variables

5. Deploy!

---

## Option 7: Local Server (Share via Ngrok)

**For testing/demo purposes:**

1. **Start your app:**
   ```bash
   npm run dev
   ```

2. **Install ngrok:** [Download here](https://ngrok.com/download)

3. **Expose to internet:**
   ```bash
   ngrok http 5000
   ```

4. Share the ngrok URL (e.g., `https://abc123.ngrok.io`)

**Note:** Free ngrok URLs change on restart.

---

## Option 8: Fly.io (CLI)

1. **Install Fly CLI:** [Download here](https://fly.io/docs/hands-on/install-flyctl/)

2. **Login & Launch:**
   ```bash
   fly auth login
   fly launch
   ```

3. Follow prompts, Fly.io deploys automatically!

4. **Set secrets:**
   ```bash
   fly secrets set JWT_SECRET=your-secret-key
   ```

---

## 🎯 Recommended Without GitHub:

### **Railway CLI** (Fastest)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
railway variables set JWT_SECRET=your-secret
```
✅ 2 minutes to deploy!

### **Vercel CLI** (Easiest)
```bash
npm install -g vercel
vercel
```
✅ One command deployment!

---

## 📦 Pre-Deploy Checklist

Before deploying:
```bash
# 1. Build locally to test
npm install
cd client && npm install && npm run build && cd ..

# 2. Test production mode
set NODE_ENV=production
npm start

# 3. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔐 Environment Variables

All platforms need:
- `NODE_ENV` = `production`
- `JWT_SECRET` = `your-generated-secret`

---

**🎉 Choose any option above and deploy without GitHub!**
