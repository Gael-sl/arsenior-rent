import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase, seedDatabase } from './config/db';
import { initMailer } from './config/mail';

// Importar TODAS las rutas
import authRoutes from './routes/auth';
import carsRoutes from './routes/cars';
import reservationsRoutes from './routes/reservations';
import checklistsRoutes from './routes/checklists';
import ratingsRoutes from './routes/ratings';
import trackingRoutes from './routes/tracking';
import adminRoutes from './routes/admin';
import maintenanceRoutes from './routes/maintenance';
import notificationsRoutes from './routes/notifications';
import paymentsRoutes from './routes/payments';
import aiRoutes from './routes/ai';
import favoritesRoutes from './routes/favorites';

// Cargar .env solo si existe (en producción Railway inyecta variables directamente)
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Log para debug en Railway
console.log(`[DEBUG] PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV || 'not set'}`);
console.log(`[DEBUG] Starting server...`);

// CORS - Configuración correcta para producción
const allowedOrigins = [
  "https://arsenior-rent-lu5a.vercel.app",
  "http://localhost:4200",
  "http://localhost:4000",
  "http://127.0.0.1:4200"
];

app.use(cors({
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Permitir requests sin origin (como Postman o curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Temporalmente permitir todos para debug
    }
  },
  methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  allowedHeaders: "Content-Type, Authorization, X-Requested-With, Accept, Origin",
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Inicializar base de datos y mailer
initDatabase();

// Ejecutar seed (incluye usuarios de prueba)
seedDatabase();

initMailer(); // Inicializar servicio de email

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'Arsenior Rent API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth',
      cars: '/api/cars',
      reservations: '/api/reservations',
      checklists: '/api/checklists',
      ratings: '/api/ratings',
      tracking: '/api/tracking',
      admin: '/api/admin',
      maintenance: '/api/maintenance'
    }
  });
});

// RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/cars', carsRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/checklists', checklistsRoutes);
app.use('/api/ratings', ratingsRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/favorites', favoritesRoutes);

// Manejo de rutas no encontradas
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    message: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  });
});

// Manejo de errores global
app.use((err: any, req: Request, res: Response, next: any) => {
  res.status(500).json({ 
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor - Railway requiere escuchar en 0.0.0.0
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`
+-----------------------------------------------+
|                                               |
|         ARSENIOR RENT API v1.0.0              |
|                                               |
|   [OK] Servidor corriendo en puerto ${PORT}       |
|   [OK] Base de datos SQLite inicializada      |
|   [->] Endpoint: http://localhost:${PORT}         |
|                                               |
|   ENDPOINTS DISPONIBLES:                      |
|   - /api/auth          (Autenticacion)        |
|   - /api/cars          (Vehiculos)            |
|   - /api/reservations  (Reservas)             |
|   - /api/checklists    (Listas de Cotejo)     |
|   - /api/ratings       (Calificaciones)       |
|   - /api/tracking      (GPS Tracking)         |
|   - /api/admin         (Panel Admin)          |
|   - /api/maintenance   (Mantenimiento)        |
|   - /api/notifications (Notificaciones)       |
|                                               |
|   Usuarios de prueba:                         |
|   Admin: admin@arseniorrent.com / Admin123    |
|   User:  user@test.com / user123              |
|                                               |
+-----------------------------------------------+
  `);
});

export default app;