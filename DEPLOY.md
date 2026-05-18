# Деплой

## 1. Backend → Fly.io

```bash
cd backend
fly launch --name bio-board --region ams --no-deploy
```

Затем выставить секреты:
```bash
fly secrets set JWT_SECRET="your-secret-here"
fly secrets set OPENAI_API_KEY="sk-..."
fly secrets set OPENAI_BASE_URL="https://coding-intl.dashscope.aliyuncs.com/v1"
fly secrets set OPENAI_MODEL="kimi-k2.5"
fly secrets set ADMIN_USER="admin"
fly secrets set ADMIN_PASS="admin"
```

Деплой:
```bash
fly deploy
```

Проверить: `curl https://bio-board.fly.dev/health`

## 2. Frontend → Vercel

Через UI (скриншот из сообщения):
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Application Preset**: `Vite`
- **Environment Variables**: `VITE_API_URL=https://bio-board.fly.dev/api`

Или CLI:
```bash
cd frontend
npm install -g vercel
vercel --prod
```

## 3. CORS

После деплоя бэкенда, обновить в `.env` бэкенда:
```
CORS_ORIGINS=http://localhost:8401,https://bio-board.vercel.app
```

Или выставить через fly secrets:
```bash
fly secrets set CORS_ORIGINS="https://bio-board-5g2g.vercel.app"
```

## 4. Файлы

| Файл | Назначение |
|------|-----------|
| `frontend/vercel.json` | SPA fallback для Vercel |
| `frontend/.env.production` | URL бэкенда для сборки |
| `backend/fly.toml` | Конфиг Fly.io |
| `backend/Dockerfile` | Обновлён для Fly.io (healthcheck, PORT env) |
