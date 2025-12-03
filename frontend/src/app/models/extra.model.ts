export interface ExtraEquipment {
  id: number;
  name: string;
  description: string;
  price: number;
  category: 'seguridad' | 'confort' | 'entretenimiento' | 'otros';
  available: boolean;
  image?: string;
  createdAt: string;
}

export const DEFAULT_EXTRAS: ExtraEquipment[] = [
  {
    id: 1,
    name: 'GPS Premium',
    description: 'Sistema de navegación con mapas actualizados',
    price: 50,
    category: 'entretenimiento',
    available: true
    ,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 2,
    name: 'Silla de Bebé',
    description: 'Silla de seguridad para niños (0-4 años)',
    price: 75,
    category: 'seguridad',
    available: true
    ,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 3,
    name: 'Conductor Adicional',
    description: 'Autorización para un conductor adicional',
    price: 100,
    category: 'otros',
    available: true
    ,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 4,
    name: 'Seguro Premium',
    description: 'Cobertura total sin deducible',
    price: 200,
    category: 'seguridad',
    available: true
    ,
    createdAt: '2025-01-01T00:00:00.000Z'
  },
  {
    id: 5,
    name: 'WiFi Portátil',
    description: 'Dispositivo WiFi 4G ilimitado',
    price: 60,
    category: 'entretenimiento',
    available: true
    ,
    createdAt: '2025-01-01T00:00:00.000Z'
  }
];