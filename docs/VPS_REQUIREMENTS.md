# VPS Requirements for EverReach Discord Bot

**Date**: October 9, 2025  
**Bot Version**: 1.0.0  
**Tech Stack**: Node.js 22.x + NestJS + PostgreSQL + Discord.js

---

## 📊 Current Resource Usage (Running Bot)

### Application
- **Runtime Memory**: ~118 MB (idle state)
- **CPU Usage**: < 1% (idle)
- **Disk Space (code)**: 445 MB total
  - `node_modules`: 443 MB
  - `dist` (compiled): 692 KB
  - Source code: < 2 MB

### Database (PostgreSQL)
- **Schema**: 9 tables (User, Character, Item, Inventory, TxLog, Trade, Auction, Bid, Note)
- **Initial Size**: < 100 MB
- **Estimated Growth**: 50-100 MB per 1000 active users

---

## 🎯 Recommended VPS Specifications

### 🥉 **Minimum (Budget Option)**
**Best for**: Small Discord servers (< 100 members), testing

| Component | Specification | Reason |
|-----------|--------------|--------|
| **CPU** | 1 vCPU / 1 Core | Node.js is single-threaded for main event loop |
| **RAM** | 1 GB | 118 MB app + 256 MB PostgreSQL + 256 MB OS + 370 MB buffer |
| **Disk** | 10 GB SSD | 445 MB app + 5 GB PostgreSQL + 2 GB OS + 2.5 GB buffer |
| **Bandwidth** | 500 GB/month | Discord API calls are lightweight |
| **Network** | 100 Mbps | Adequate for Discord bot traffic |

**Expected Cost**: $3-5/month

**Providers**:
- Hetzner: CPX11 (€3.79/month) ✅ **Best value**
- DigitalOcean: Basic Droplet ($6/month)
- Vultr: 1GB plan ($6/month)

⚠️ **Warning**: This is tight and not recommended for production!

---

### 🥈 **Recommended (Optimal for Most Cases)**
**Best for**: Medium Discord servers (100-500 members), production use

| Component | Specification | Reason |
|-----------|--------------|--------|
| **CPU** | 2 vCPU / 2 Cores | Handles database + bot + system processes comfortably |
| **RAM** | 2 GB | 200 MB app + 512 MB PostgreSQL + 512 MB OS + 776 MB buffer |
| **Disk** | 20-40 GB SSD | Room for logs, backups, database growth |
| **Bandwidth** | 1-2 TB/month | More than enough for Discord traffic |
| **Network** | 1 Gbps | Fast response times |

**Expected Cost**: $10-12/month

**Providers**:
- **Hetzner: CPX21 (€6.19/month)** ✅ **BEST CHOICE**
- DigitalOcean: Basic Droplet 2GB ($12/month)
- Vultr: 2GB plan ($12/month)
- Linode: Nanode 2GB ($12/month)

✅ **This is the sweet spot for production!**

---

### 🥇 **Premium (High Traffic / Growth)**
**Best for**: Large Discord servers (500+ members), heavy traffic

| Component | Specification | Reason |
|-----------|--------------|--------|
| **CPU** | 4 vCPU / 4 Cores | Handles concurrent requests, background jobs |
| **RAM** | 4 GB | Plenty of headroom for caching, spikes |
| **Disk** | 80 GB SSD | Room for extensive logs, backups, analytics |
| **Bandwidth** | 4 TB/month | No worries about traffic |
| **Network** | 1 Gbps | Fastest response times |

**Expected Cost**: $18-24/month

**Providers**:
- Hetzner: CPX31 (€13.09/month) ✅ **Best value**
- DigitalOcean: 4GB Droplet ($24/month)
- Vultr: 4GB plan ($24/month)

✅ **Future-proof option**

---

## 🌍 VPS Provider Comparison

### 1. **Hetzner** ⭐ **HIGHLY RECOMMENDED**

**Pros**:
- ✅ Best price/performance ratio in Europe
- ✅ Excellent network (1 Gbps on all plans)
- ✅ Free snapshots & backups
- ✅ 20 TB bandwidth on even smallest plan
- ✅ High-quality hardware
- ✅ Great uptime (99.95%+)

**Cons**:
- ❌ Data centers only in EU (Germany, Finland)
- ❌ Not ideal if your Discord server is US-based

**Recommended Plan**: CPX21 (€6.19/month = ~$6.50/month)
- 2 vCPU, 4 GB RAM, 40 GB SSD, 20 TB bandwidth
- **Best value overall!**

**Location**: Nuremberg, Germany or Helsinki, Finland

---

### 2. **DigitalOcean**

**Pros**:
- ✅ Global data centers (NA, EU, APAC)
- ✅ Easy-to-use interface
- ✅ Excellent documentation
- ✅ Built-in monitoring

**Cons**:
- ❌ More expensive than Hetzner
- ❌ Bandwidth limits are lower

**Recommended Plan**: Basic Droplet 2GB ($12/month)
- 2 vCPU, 2 GB RAM, 50 GB SSD, 2 TB bandwidth

**Good for**: US-based Discord servers

---

### 3. **Vultr**

**Pros**:
- ✅ Global coverage (25+ locations)
- ✅ Good performance
- ✅ Frequent promotions

**Cons**:
- ❌ Similar pricing to DigitalOcean
- ❌ Less community support

**Recommended Plan**: 2GB ($12/month)
- 1 vCPU, 2 GB RAM, 55 GB SSD, 2 TB bandwidth

---

### 4. **Contabo** (Budget Alternative)

**Pros**:
- ✅ Very cheap (VPS S: €4.50/month)
- ✅ High specs for price

**Cons**:
- ❌ Oversold servers (slower performance)
- ❌ Mixed reviews on reliability
- ❌ Support can be slow

**Only if**: You're on a tight budget and can tolerate occasional slowdowns

---

### 5. **Oracle Cloud** (Free Tier Option)

**Pros**:
- ✅ **FREE FOREVER** tier available
- ✅ 1-4 ARM cores + 6-24 GB RAM (if you can get ARM)
- ✅ 200 GB storage
- ✅ Always free (no credit card charges)

**Cons**:
- ❌ Hard to sign up (they reject many users)
- ❌ ARM architecture requires different Node.js build
- ❌ Complex setup
- ❌ Can shut down if "abuse" detected

**Worth trying**: If you get approved, it's free!

---

## 🔧 Required Software Stack

### Base System
```bash
# Operating System
Ubuntu 22.04 LTS (recommended) or 24.04 LTS

# Runtime
Node.js 22.x (via nvm or NodeSource)
npm 11.x (comes with Node.js)
```

### Database
```bash
PostgreSQL 16 or 15
# Estimated RAM usage: 256-512 MB
# Disk usage: 100 MB + data growth
```

### Process Management
```bash
PM2 (already in your devDependencies)
# Ensures bot auto-restarts on crash
# Handles zero-downtime deployments
```

### Optional but Recommended
```bash
# Monitoring
htop - Resource monitoring
# Logs
logrotate - Automatic log rotation
# Security
fail2ban - Brute force protection
ufw - Firewall
```

---

## 📈 Resource Scaling Projections

### Expected Growth Per User Activity

| Server Size | Bot RAM | PostgreSQL RAM | Disk (DB) | Total RAM Needed |
|-------------|---------|----------------|-----------|------------------|
| **1-50 users** | 150 MB | 256 MB | 100 MB | **1 GB** |
| **50-200 users** | 200 MB | 384 MB | 500 MB | **1.5 GB** |
| **200-500 users** | 250 MB | 512 MB | 2 GB | **2 GB** ✅ |
| **500-1000 users** | 350 MB | 768 MB | 5 GB | **3 GB** |
| **1000+ users** | 500 MB | 1 GB | 10 GB+ | **4 GB+** |

---

## 💾 Database Growth Estimation

### Per User Storage
- **User Record**: ~200 bytes
- **Character + Inventory**: ~1-2 KB
- **Notes (with embeddings)**: ~5-10 KB per note
- **Transactions**: ~500 bytes per transaction
- **Auctions/Trades**: ~1 KB per auction/trade

### Realistic Projections
- **100 active users**: ~5-10 MB
- **500 active users**: ~25-50 MB
- **1000 active users**: ~50-100 MB
- **5000 active users**: ~250-500 MB

**Plus**:
- Indexes: +20-30% overhead
- Logs: 10-50 MB/month (with log rotation)

---

## 🌐 Network Bandwidth Usage

### Discord API Traffic
- **Typical bot**: 100-500 MB/month for small servers
- **Your bot** (with commands): ~200-1000 MB/month
- **Database backups**: 10-100 MB/week

### Expected Total Bandwidth
- **Small server (< 100 users)**: 1-2 GB/month
- **Medium server (100-500 users)**: 3-5 GB/month
- **Large server (500+ users)**: 10-20 GB/month

**Conclusion**: Even 500 GB/month is overkill for a Discord bot.

---

## 🎯 Final Recommendation

### For You: **Hetzner CPX21**

**Specifications**:
- **2 vCPU (AMD or Intel)**
- **4 GB RAM**
- **40 GB NVMe SSD**
- **20 TB bandwidth**
- **€6.19/month (~$6.50/month)**

**Why This Plan**:
1. ✅ **Plenty of headroom**: 4 GB RAM vs. your 118 MB usage
2. ✅ **Future-proof**: Can handle 500+ users easily
3. ✅ **Excellent network**: 1 Gbps, 20 TB bandwidth
4. ✅ **Best value**: More specs than DO's $12 plan at half the price
5. ✅ **Reliable**: Hetzner has excellent uptime
6. ✅ **Room for growth**: Can add PostgreSQL, monitoring, logs

**Location Consideration**:
- If your Discord server is **EU-based**: Perfect! ✅
- If your Discord server is **US-based**: Still good, but expect 80-120ms latency (acceptable for bots)

**Alternative if US-based**: DigitalOcean NYC/SF ($12/month for 2GB)

---

## 📋 Setup Checklist

### Initial Setup
```bash
# 1. Create VPS with Ubuntu 22.04 LTS
# 2. Update system
sudo apt update && sudo apt upgrade -y

# 3. Install Node.js 22.x
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 22
nvm use 22

# 4. Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# 5. Install PM2 globally
npm install -g pm2 yarn

# 6. Setup firewall
sudo ufw allow 22    # SSH
sudo ufw allow 3000  # Your app (if needed)
sudo ufw enable

# 7. Create database
sudo -u postgres createdb everreach

# 8. Clone your repo
git clone <your-repo-url>
cd everreach-assistant

# 9. Install dependencies
yarn install

# 10. Setup environment
cp .env.example .env
nano .env  # Add your credentials

# 11. Run migrations
yarn prisma:migrate

# 12. Build
yarn build

# 13. Start with PM2
pm2 start dist/src/main.js --name everreach-bot
pm2 save
pm2 startup  # Setup auto-start on reboot
```

---

## 💰 Cost Breakdown (Annual)

### Hetzner CPX21 (Recommended)
- **Monthly**: €6.19
- **Annual**: €74.28 (~$78)
- **Per day**: €0.21 (~$0.22)

### Additional Costs (Optional)
- **Domain name**: $10-15/year
- **Cloudflare** (monitoring): FREE
- **Backup storage**: FREE (Hetzner includes snapshots)

**Total Annual Cost**: **~$80-90/year**

---

## 🔒 Security Considerations

### Essential
1. ✅ SSH key authentication only (disable password login)
2. ✅ UFW firewall enabled
3. ✅ Regular system updates (`unattended-upgrades`)
4. ✅ PostgreSQL not exposed to public (localhost only)
5. ✅ Environment variables in `.env` (never commit)

### Recommended
1. ✅ fail2ban for brute force protection
2. ✅ Regular database backups
3. ✅ Monitoring (PM2 monitoring or UptimeRobot)
4. ✅ Log rotation

---

## 📊 Performance Benchmarks

### Expected Response Times
- **Command execution**: < 100ms (local processing)
- **Database queries**: < 10ms (on same server)
- **Discord API calls**: 50-200ms (depends on Discord)
- **Total user experience**: < 300ms (excellent!)

### Expected Uptime
- **Hetzner SLA**: 99.95% uptime
- **Your bot**: ~99.9%+ with PM2 auto-restart
- **Database**: 99.99% (PostgreSQL is rock-solid)

---

## 🚀 Deployment Strategy

### Zero-Downtime Deployment with PM2
```bash
# Build new version
yarn build

# Reload with PM2 (zero downtime)
pm2 reload everreach-bot

# Check status
pm2 status

# View logs
pm2 logs everreach-bot
```

### Backup Strategy
```bash
# Daily database backup (cron job)
0 2 * * * pg_dump everreach > /backups/everreach_$(date +\%Y\%m\%d).sql

# Keep last 7 days
0 3 * * * find /backups -name "everreach_*.sql" -mtime +7 -delete
```

---

## 🎯 Summary

### Quick Answer
**Buy**: [Hetzner CPX21](https://www.hetzner.com/cloud) (€6.19/month)
- 2 vCPU, 4 GB RAM, 40 GB SSD
- More than enough for your bot + database
- Best value in the market

### If Not in EU
**Buy**: [DigitalOcean 2GB Droplet](https://www.digitalocean.com/pricing/droplets) ($12/month)
- Choose region closest to your Discord server

### If Ultra-Budget
**Try**: [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
- FREE but hard to get approved
- Requires more technical setup

---

## 📞 Next Steps

1. ✅ Sign up for Hetzner
2. ✅ Create CPX21 instance with Ubuntu 22.04
3. ✅ Follow setup checklist above
4. ✅ Deploy your bot
5. ✅ Setup monitoring
6. ✅ Configure backups

**Estimated Setup Time**: 1-2 hours

**Your bot will be online 24/7 for ~$7/month!** 🎉

---

## 📚 Additional Resources

- [Hetzner Cloud Documentation](https://docs.hetzner.com/cloud/)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Questions? Check the troubleshooting section or refer to the bot documentation!**

