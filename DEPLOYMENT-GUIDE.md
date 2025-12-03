# 🚀 Guía de Despliegue - Arsenior Rent

## 📋 Preparación Previa

### 1. Crear Repositorio en GitHub
1. Ve a https://github.com/new
2. Nombre: `arsenior-rent` (o el que prefieras)
3. Hazlo **privado** (recomendado)
4. NO inicialices con README

### 2. Subir Código a GitHub

Abre PowerShell en la carpeta raíz del proyecto y ejecuta:

```powershell
cd C:\Users\gaela\ARSENIOR-RENT

# Inicializar Git (si no lo has hecho)
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Initial commit - Arsenior Rent"

# Conectar con tu repositorio (reemplaza TU-USUARIO)
git remote add origin https://github.com/TU-USUARIO/arsenior-rent.git

# Subir código
git branch -M main
git push -u origin main
```

---

## 🚂 BACKEND - Railway

### Paso 1: Crear Proyecto en Railway
1. Ve a https://railway.app
2. Inicia sesión (usa GitHub)
3. Click en **"New Project"**
4. Selecciona **"Deploy from GitHub repo"**
5. Busca y selecciona `arsenior-rent`
6. Railway detectará automáticamente el backend

### Paso 2: Configurar Variables de Entorno
En Railway, ve a tu proyecto → **Variables** y agrega:

```
PORT=3000
JWT_SECRET=arseniorrent09
JWT_EXPIRES_IN=7d
NODE_ENV=production

MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=pruebatest718@gmail.com
MAIL_PASS=eeyklfzulppvudjo
MAIL_FROM="Arsenior Rent" <pruebatest718@gmail.com>

FRONTEND_URL=https://tu-app.vercel.app
GROQ_API_KEY=tu-groq-api-key-aqui
```

### Paso 3: Configurar Dominio
1. En Railway, ve a **Settings** → **Networking**
2. Click en **"Generate Domain"**
3. Copia la URL (algo como: `https://arsenior-rent-backend.up.railway.app`)
4. **GUARDA ESTA URL** - la necesitarás para el frontend

### Paso 4: Configurar Root Directory
1. Ve a **Settings** → **Build**
2. En **Root Directory** pon: `backend`
3. En **Start Command** pon: `npm start`

---

## ▲ FRONTEND - Vercel

### Paso 1: Actualizar URL del Backend
1. Abre: `frontend/src/environments/environment.prod.ts`
2. Reemplaza con la URL de Railway:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://TU-URL-DE-RAILWAY.up.railway.app/api'
};
```

3. Guarda y haz commit:
```powershell
git add .
git commit -m "Update backend URL for production"
git push
```

### Paso 2: Crear Proyecto en Vercel
1. Ve a https://vercel.com
2. Inicia sesión con GitHub
3. Click en **"Add New..."** → **"Project"**
4. Importa tu repositorio `arsenior-rent`

### Paso 3: Configurar Build
En la configuración del proyecto:

- **Framework Preset**: Angular
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `dist/frontend/browser`

### Paso 4: Deploy
1. Click en **"Deploy"**
2. Espera 2-3 minutos
3. ¡Tu app estará lista!

### Paso 5: Actualizar CORS en Backend
1. Ve a Railway → tu proyecto backend
2. En **Variables**, actualiza `FRONTEND_URL` con tu URL de Vercel:
```
FRONTEND_URL=https://tu-app-nombre.vercel.app
```

---

## ✅ Verificación Final

1. **Backend**: Visita `https://tu-railway-url.up.railway.app/health`
   - Debe responder: `{"status":"ok"}`

2. **Frontend**: Visita `https://tu-vercel-url.vercel.app`
   - Debe cargar la página de inicio

3. **Conexión**: Intenta iniciar sesión
   - Si funciona, ¡todo está conectado! 🎉

---

## 🔧 Solución de Problemas

### Backend no arranca
- Verifica que las variables de entorno estén correctas
- Revisa los logs en Railway: **Deployments** → click en el deployment → **View Logs**

### Frontend no se conecta al backend
- Verifica que `environment.prod.ts` tenga la URL correcta de Railway
- Asegúrate de que `FRONTEND_URL` en Railway apunte a Vercel
- Revisa la consola del navegador (F12) para errores de CORS

### Base de datos no persiste
- Railway incluye almacenamiento persistente por defecto
- Verifica que el archivo `arsenior-rent.db` se esté creando

---

## 🎉 ¡Listo!

Tu aplicación ya está en producción:
- **Frontend**: https://tu-app.vercel.app
- **Backend**: https://tu-backend.railway.app
- **Panel Admin**: https://tu-app.vercel.app/admin

---

## 📝 Notas Importantes

1. **Actualizar código**: Solo haz `git push` y ambos servicios se actualizarán automáticamente
2. **Logs**: Revisa los logs en Railway y Vercel para debugging
3. **Costos**: Railway plan pagado + Vercel gratis = ~$5-20/mes dependiendo del uso
4. **Backups**: Descarga regularmente la base de datos desde Railway
