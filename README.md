# 🤖 Jarvis - Production-Ready Personal WhatsApp AI Assistant

**Jarvis** is a self-hosted, modular, secure, and production-ready Personal WhatsApp AI Operating System Assistant. Built with TypeScript, Baileys (@whiskeysockets/baileys), OpenRouter API, Neon PostgreSQL (Prisma ORM), Node-cron, and a sleek Next.js / Tailwind CSS Web Dashboard.

---

## 🌟 Key Features

### 🛡️ Strict Chat Whitelist & Authorization System (Core Security Rule)
- Jarvis **NEVER** automatically replies to every WhatsApp message.
- Every detected chat starts as **Disabled** by default.
- Chat Permission Modes:
  - **Disabled**: Ignores every incoming message completely. Zero storage, zero processing, zero replies.
  - **Read Only**: Reads and logs messages to DB for history, but sends zero replies.
  - **AI Enabled**: Full AI operating system mode. Processes reminders, memory facts, password vault items, and auto-replies in that chat only.

### ⏰ Natural Language Reminder Engine
- Schedule single or recurring reminders in plain English (e.g. `"Remind me in 10 minutes to say Hello"`, `"Tomorrow 2 PM dentist appointment"`, `"Every Monday at 8 AM gym"`).
- Automatically triggers notifications strictly inside the originating AI-enabled WhatsApp chat when the time comes.

### 🧠 Permanent Fact Memory Bank
- Remembers facts explicitly requested by the user (e.g. `"My WiFi password is ABC123"`, `"My office locker is 4982"`).
- Responds accurately to recall queries (e.g. `"What is my WiFi password?"`, `"What is my locker code?"`).

### 🔐 AES-256-GCM Password Vault
- Encrypts sensitive credentials at rest using a 32-byte master key (`VAULT_MASTER_KEY`).
- Allows creation, lookup, reveal toggle, copy-to-clipboard, and deletion from the Web Dashboard.

### 💻 Web Dashboard Control Center
- Real-time Baileys QR Code scanner & session health monitor.
- Authorized Chats Whitelist editor.
- Reminders table & manual scheduler.
- Encrypted Password Vault view.
- Memory Bank search.
- Live System Audit & Event logs.

---

## 🚀 Quick Setup & Deployment

### 1. Environment Configuration
Copy `.env.example` to `.env` and fill in your variables:

```bash
DATABASE_URL="postgresql://user:pass@ep-cool-db-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-cool-db-123.us-east-2.aws.neon.tech/neondb?sslmode=require"
OPENROUTER_API_KEY="sk-or-v1-your-openrouter-key"
OPENROUTER_MODEL="anthropic/claude-3.5-sonnet"
VAULT_MASTER_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

### 2. Local Development Start
```bash
# Install dependencies
npm install

# Push database schema to Neon
npm run db:push

# Start Web Dashboard (port 3000) & Backend Worker (port 3001)
npm run dev
```

### 3. Production Docker Deployment
```bash
docker-compose up -d --build
```

---

## 📱 How to Use Jarvis

1. Open Web Dashboard at `http://localhost:3000`.
2. Go to **WhatsApp Connection** and scan the QR code using WhatsApp on your phone.
3. Go to **Authorized Chats** page. By default all chats are **Disabled**.
4. Set permission mode to **AI Enabled** for your **Jarvis** chat.
5. In your Jarvis WhatsApp chat, type:
   > `"Remind me in 10 minutes to say Hello"`
6. Jarvis will confirm the reminder, and 10 minutes later, will automatically send `"Hello 👋"` in your Jarvis chat!
