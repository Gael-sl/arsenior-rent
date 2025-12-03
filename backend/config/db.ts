import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'database.sqlite');
const db = new Database(dbPath);

// Habilitar foreign keys
db.pragma('foreign_keys = ON');

// Función para inicializar todas las tablas
export const initDatabase = (): void => {

  // TABLA: Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      phone TEXT NOT NULL,
      role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      rating REAL DEFAULT 0,
      totalRentals INTEGER DEFAULT 0,
      emailVerified INTEGER DEFAULT 0,
      emailToken TEXT,
      emailTokenExpires TEXT,
      resetToken TEXT,
      resetTokenExpires TEXT,
      createdAt TEXT DEFAULT (datetime('now'))
    )
  `);
  
  // Migración: agregar columnas si no existen (para DBs existentes)
  try {
    db.exec(`ALTER TABLE users ADD COLUMN emailVerified INTEGER DEFAULT 0`);
  } catch (e) { /* columna ya existe */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN emailToken TEXT`);
  } catch (e) { /* columna ya existe */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN emailTokenExpires TEXT`);
  } catch (e) { /* columna ya existe */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN resetToken TEXT`);
  } catch (e) { /* columna ya existe */ }
  try {
    db.exec(`ALTER TABLE users ADD COLUMN resetTokenExpires TEXT`);
  } catch (e) { /* columna ya existe */ }

  // Migracion: agregar galeria de fotos a cars
  try {
    db.exec(`ALTER TABLE cars ADD COLUMN gallery TEXT`);
  } catch (e) { /* columna ya existe */ }

  // TABLA: Cars
  db.exec(`
    CREATE TABLE IF NOT EXISTS cars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER NOT NULL,
      segment TEXT CHECK(segment IN ('A', 'B', 'C')) NOT NULL,
      transmission TEXT CHECK(transmission IN ('Automática', 'Manual')) NOT NULL,
      fuelType TEXT CHECK(fuelType IN ('Gasolina', 'Diésel', 'Eléctrico', 'Híbrido')) NOT NULL,
      seats INTEGER NOT NULL,
      doors INTEGER NOT NULL,
      luggage INTEGER NOT NULL,
      image TEXT,
      pricePerDay REAL NOT NULL,
      status TEXT DEFAULT 'disponible' CHECK(status IN ('disponible', 'rentado', 'mantenimiento')),
      rating REAL DEFAULT 0,
      totalRatings INTEGER DEFAULT 0,
      features TEXT,
      description TEXT,
      licensePlate TEXT UNIQUE,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    )
  `);

  // TABLA: Reservations
  db.exec(`
    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      carId INTEGER NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      originalEndDate TEXT,
      plan TEXT CHECK(plan IN ('Regular', 'Premium')) NOT NULL,
      totalDays INTEGER NOT NULL,
      pricePerDay REAL NOT NULL,
      subtotal REAL NOT NULL,
      extras TEXT,
      extrasTotal REAL DEFAULT 0,
      totalAmount REAL NOT NULL,
      depositAmount REAL NOT NULL,
      depositPaid INTEGER DEFAULT 0,
      depositPaidAt TEXT,
      finalPaid INTEGER DEFAULT 0,
      finalPaidAt TEXT,
      qrCode TEXT,
      status TEXT DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'confirmada', 'activa', 'completada', 'cancelada', 'extendida')),
      isEarlyReturn INTEGER DEFAULT 0,
      earlyReturnDate TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (carId) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);

  // TABLA: Checklists
  db.exec(`
    CREATE TABLE IF NOT EXISTS checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservationId INTEGER NOT NULL,
      type TEXT CHECK(type IN ('pickup', 'return')) NOT NULL,
      inspector TEXT NOT NULL,
      inspectorRole TEXT DEFAULT 'user' CHECK(inspectorRole IN ('user', 'admin')),
      exteriorCondition TEXT NOT NULL,
      exteriorNotes TEXT,
      interiorCondition TEXT NOT NULL,
      interiorNotes TEXT,
      tiresCondition TEXT NOT NULL,
      lightsCondition TEXT NOT NULL,
      mechanicalCondition TEXT NOT NULL,
      fuelLevel INTEGER NOT NULL,
      damages TEXT,
      vehiclePhoto TEXT,
      receivedBy TEXT,
      receivedByRole TEXT DEFAULT 'admin',
      receivedAt TEXT,
      extraCharges TEXT,
      totalExtraCharges REAL DEFAULT 0,
      notes TEXT,
      completedAt TEXT DEFAULT (datetime('now')),
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE CASCADE
    )
  `);

  // TABLA: Ratings
  db.exec(`
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservationId INTEGER NOT NULL,
      userId INTEGER NOT NULL,
      carId INTEGER NOT NULL,
      userToCarRating TEXT,
      adminToUserRating TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (carId) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);

  // TABLA: VehicleLocations (Tracking GPS)
  db.exec(`
    CREATE TABLE IF NOT EXISTS vehicle_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      carId INTEGER NOT NULL,
      reservationId INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      speed REAL,
      heading REAL,
      accuracy REAL,
      timestamp TEXT DEFAULT (datetime('now')),
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (carId) REFERENCES cars(id) ON DELETE CASCADE,
      FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE CASCADE
    )
  `);

  // TABLA: Payments
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reservationId INTEGER NOT NULL,
      amount REAL NOT NULL,
      type TEXT CHECK(type IN ('deposit', 'final', 'extra')) NOT NULL,
      method TEXT CHECK(method IN ('efectivo', 'tarjeta', 'transferencia', 'qr')) NOT NULL,
      status TEXT DEFAULT 'pendiente' CHECK(status IN ('pendiente', 'completado', 'fallido')),
      transactionId TEXT,
      qrCode TEXT,
      paidAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE CASCADE
    )
  `);

    // TABLA: Maintenances
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      carId INTEGER NOT NULL,
      types TEXT NOT NULL,
      mechanic TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT,
      status TEXT DEFAULT 'programado' CHECK(status IN ('programado', 'en_proceso', 'completado')),
      totalCost REAL NOT NULL,
      notes TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (carId) REFERENCES cars(id) ON DELETE CASCADE
    )
  `);

  // TABLA: Maintenance Items
  db.exec(`
    CREATE TABLE IF NOT EXISTS maintenance_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      maintenanceId INTEGER NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      cost REAL NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (maintenanceId) REFERENCES maintenances(id) ON DELETE CASCADE
    )
  `);

  // TABLA: Notifications
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      reservationId INTEGER,
      type TEXT CHECK(type IN ('reminder_pickup', 'reminder_return', 'reservation_confirmed', 'reservation_cancelled', 'payment_received', 'checklist_complete', 'rating_request', 'system')) NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      isRead INTEGER DEFAULT 0,
      emailSent INTEGER DEFAULT 0,
      emailSentAt TEXT,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reservationId) REFERENCES reservations(id) ON DELETE SET NULL
    )
  `);

  // TABLA: Favorites (Favoritos de usuarios)
  db.exec(`
    CREATE TABLE IF NOT EXISTS favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      carId INTEGER NOT NULL,
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (carId) REFERENCES cars(id) ON DELETE CASCADE,
      UNIQUE(userId, carId)
    )
  `);
};

// Función para seed data (datos de ejemplo)
export const seedDatabase = (): void => {
  // Usuario admin por defecto
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@arseniorrent.com');
  const bcrypt = require('bcryptjs');
  const hashedAdminPassword = bcrypt.hashSync('Admin123', 10);
  
  if (!adminExists) {
    db.prepare(`
      INSERT INTO users (email, password, firstName, lastName, phone, role, rating, totalRentals, emailVerified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run('admin@arseniorrent.com', hashedAdminPassword, 'Admin', 'Arsenior', '+52 123 456 7890', 'admin', 5.0, 0);
  } else {
    // Actualizar contraseña del admin existente y asegurar que esté verificado
    db.prepare(`
      UPDATE users SET password = ?, emailVerified = 1 WHERE email = ?
    `).run(hashedAdminPassword, 'admin@arseniorrent.com');
  }

  // Usuario de prueba
  const userExists = db.prepare('SELECT id FROM users WHERE email = ?').get('user@test.com');
  
  if (!userExists) {
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync('user123', 10);
    
    db.prepare(`
      INSERT INTO users (email, password, firstName, lastName, phone, role, rating, totalRentals)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('user@test.com', hashedPassword, 'Juan', 'Pérez', '+52 987 654 3210', 'user', 4.5, 3);
  }

  // Carros de ejemplo
  const carsCount = db.prepare('SELECT COUNT(*) as count FROM cars').get() as any;
  
  if (carsCount.count === 0) {
    const sampleCars = [
      {
        brand: 'BMW',
        model: 'Serie 5',
        year: 2024,
        segment: 'A',
        transmission: 'Automática',
        fuelType: 'Gasolina',
        seats: 5,
        doors: 4,
        luggage: 3,
        image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
        pricePerDay: 1500,
        status: 'disponible',
        rating: 4.8,
        totalRatings: 12,
        features: JSON.stringify(['GPS', 'Bluetooth', 'A/C', 'Cámara Trasera', 'Asientos de Cuero']),
        description: 'Sedán de lujo con tecnología premium y máximo confort.',
        licensePlate: 'ABC-123-MX',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1520031441872-265e4ff70366?w=800',
          'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800'
        ])
      },
      {
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        segment: 'B',
        transmission: 'Automática',
        fuelType: 'Híbrido',
        seats: 5,
        doors: 4,
        luggage: 2,
        image: 'https://images.unsplash.com/photo-1623869675781-80aa31012a5a?w=800',
        pricePerDay: 800,
        status: 'disponible',
        rating: 4.5,
        totalRatings: 25,
        features: JSON.stringify(['Bluetooth', 'A/C', 'Control Crucero']),
        description: 'Sedán confiable y eficiente en combustible.',
        licensePlate: 'DEF-456-MX',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800'
        ])
      },
      {
        brand: 'Nissan',
        model: 'Versa',
        year: 2023,
        segment: 'C',
        transmission: 'Manual',
        fuelType: 'Gasolina',
        seats: 5,
        doors: 4,
        luggage: 2,
        image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800',
        pricePerDay: 500,
        status: 'disponible',
        rating: 4.0,
        totalRatings: 18,
        features: JSON.stringify(['A/C', 'Radio']),
        description: 'Opción económica y práctica para la ciudad.',
        licensePlate: 'GHI-789-MX',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
          'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800'
        ])
      },
      {
        brand: 'Mercedes-Benz',
        model: 'Clase C',
        year: 2024,
        segment: 'A',
        transmission: 'Automática',
        fuelType: 'Gasolina',
        seats: 5,
        doors: 4,
        luggage: 3,
        image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800',
        pricePerDay: 1800,
        status: 'disponible',
        rating: 5.0,
        totalRatings: 8,
        features: JSON.stringify(['GPS', 'Bluetooth', 'A/C', 'Asientos de Cuero', 'Techo Panorámico']),
        description: 'Lujo alemán con tecnología de punta.',
        licensePlate: 'JKL-012-MX',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800',
          'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800'
        ])
      },
      {
        brand: 'Honda',
        model: 'Civic',
        year: 2023,
        segment: 'B',
        transmission: 'Automática',
        fuelType: 'Gasolina',
        seats: 5,
        doors: 4,
        luggage: 2,
        image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800',
        pricePerDay: 900,
        status: 'disponible',
        rating: 4.6,
        totalRatings: 20,
        features: JSON.stringify(['GPS', 'Bluetooth', 'A/C', 'Cámara Trasera']),
        description: 'Deportivo y eficiente, perfecto para viajes largos.',
        licensePlate: 'MNO-345-MX',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800'
        ])
      },
      {
        brand: 'Volkswagen',
        model: 'Jetta',
        year: 2023,
        segment: 'B',
        transmission: 'Automática',
        fuelType: 'Gasolina',
        seats: 5,
        doors: 4,
        luggage: 3,
        image: 'https://images.unsplash.com/photo-1622562184468-ca4b0e0b4c3b?w=800',
        pricePerDay: 850,
        status: 'rentado',
        rating: 4.4,
        totalRatings: 15,
        features: JSON.stringify(['Bluetooth', 'A/C', 'Control Crucero']),
        description: 'Espacioso y cómodo para toda la familia.',
        licensePlate: 'PQR-678-MX',
        gallery: JSON.stringify([
          'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=800',
          'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=800'
        ])
      }
    ];

    const insertCar = db.prepare(`
      INSERT INTO cars (brand, model, year, segment, transmission, fuelType, seats, doors, luggage, 
                        image, pricePerDay, status, rating, totalRatings, features, description, licensePlate, gallery)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    sampleCars.forEach(car => {
      insertCar.run(
        car.brand, car.model, car.year, car.segment, car.transmission, car.fuelType,
        car.seats, car.doors, car.luggage, car.image, car.pricePerDay, car.status,
        car.rating, car.totalRatings, car.features, car.description, car.licensePlate, car.gallery
      );
    });
  }

  // Seed de posiciones GPS simuladas en Sinaloa para vehículos rentados
  const locationsCount = db.prepare('SELECT COUNT(*) as count FROM vehicle_locations').get() as any;
  
  if (locationsCount.count === 0) {
    // Obtener reservas activas para simular tracking
    const activeReservations = db.prepare(`
      SELECT r.id as reservationId, r.carId 
      FROM reservations r 
      WHERE r.status = 'activa'
      LIMIT 5
    `).all() as any[];

    if (activeReservations.length > 0) {
      // Coordenadas de ciudades en Sinaloa, México
      const sinaloaLocations = [
        { city: 'Culiacán', lat: 24.8091, lng: -107.3940 },
        { city: 'Mazatlán', lat: 23.2494, lng: -106.4111 },
        { city: 'Los Mochis', lat: 25.7934, lng: -109.0049 },
        { city: 'Guasave', lat: 25.5678, lng: -108.4681 },
        { city: 'Guamúchil', lat: 25.4619, lng: -108.0786 },
        { city: 'Ahome', lat: 25.8854, lng: -109.0830 },
        { city: 'El Fuerte', lat: 26.4095, lng: -108.6205 }
      ];

      const insertLocation = db.prepare(`
        INSERT INTO vehicle_locations (carId, reservationId, latitude, longitude, speed, heading, accuracy, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' minutes'))
      `);

      activeReservations.forEach((reservation, index) => {
        const location = sinaloaLocations[index % sinaloaLocations.length];
        
        // Agregar pequeña variación aleatoria para hacer las posiciones más realistas
        const latVariation = (Math.random() - 0.5) * 0.02; // ~2km variación
        const lngVariation = (Math.random() - 0.5) * 0.02;
        
        const latitude = location.lat + latVariation;
        const longitude = location.lng + lngVariation;
        const speed = Math.floor(Math.random() * 80) + 20; // 20-100 km/h
        const heading = Math.floor(Math.random() * 360); // 0-360 grados
        const accuracy = Math.floor(Math.random() * 20) + 5; // 5-25 metros
        const minutesAgo = Math.floor(Math.random() * 15); // 0-15 minutos atrás

        insertLocation.run(
          reservation.carId,
          reservation.reservationId,
          latitude,
          longitude,
          speed,
          heading,
          accuracy,
          minutesAgo
        );
      });
    }
  }
};

export default db;