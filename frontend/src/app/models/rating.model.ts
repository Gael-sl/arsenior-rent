export interface Rating {
  id: number;
  reservationId: number;
  userId: number;
  carId: number;
  
  // Calificación del usuario al vehículo/servicio
  userToCarRating?: UserToCarRating;
  
  // Calificación del admin al usuario
  adminToUserRating?: AdminToUserRating;
  
  createdAt: string;
  updatedAt: string;
}

export interface UserToCarRating {
  vehicleCondition: number; // 1-5
  cleanliness: number; // 1-5
  performance: number; // 1-5
  customerService: number; // 1-5
  overallRating: number; // Promedio
  comments?: string;
  ratedAt: string;
}

export interface AdminToUserRating {
  vehicleReturnCondition: number; // 1-5
  punctuality: number; // 1-5
  communication: number; // 1-5
  responsibleUse: number; // 1-5
  overallRating: number; // Promedio
  comments?: string;
  ratedAt: string;
}

export interface CreateUserRatingRequest {
  reservationId: number;
  vehicleCondition: number;
  cleanliness: number;
  performance: number;
  customerService: number;
  comments?: string;
}

export interface CreateAdminRatingRequest {
  reservationId: number;
  vehicleReturnCondition: number;
  punctuality: number;
  communication: number;
  responsibleUse: number;
  comments?: string;
}