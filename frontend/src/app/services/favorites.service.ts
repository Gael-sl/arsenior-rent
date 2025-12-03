import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Car } from '../models/car.model';

export interface FavoriteCar extends Car {
  favoriteId: number;
  addedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private apiUrl = `${environment.apiUrl}/favorites`;

  // Signal para mantener el estado de favoritos
  favorites = signal<FavoriteCar[]>([]);
  favoriteIds = signal<Set<number>>(new Set());

  constructor() {
    // Solo cargar favoritos en el navegador Y si hay token
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('arsenior_token');
      if (token) {
        // Pequeño delay para asegurar que el interceptor esté listo
        setTimeout(() => this.loadFavorites(), 200);
      }
    }
  }

  // Cargar favoritos del usuario
  loadFavorites(): void {
    this.http.get<FavoriteCar[]>(this.apiUrl).subscribe({
      next: (favorites) => {
        this.favorites.set(favorites);
        this.favoriteIds.set(new Set(favorites.map(f => f.id)));
      },
      error: (err) => {
        // Si no está autenticado, limpiar favoritos
        if (err.status === 401) {
          this.favorites.set([]);
          this.favoriteIds.set(new Set());
        }
      }
    });
  }

  // Obtener todos los favoritos
  getFavorites(): Observable<FavoriteCar[]> {
    return this.http.get<FavoriteCar[]>(this.apiUrl).pipe(
      tap(favorites => {
        this.favorites.set(favorites);
        this.favoriteIds.set(new Set(favorites.map(f => f.id)));
      })
    );
  }

  // Verificar si un carro está en favoritos (local)
  isFavorite(carId: number): boolean {
    return this.favoriteIds().has(carId);
  }

  // Verificar si un carro está en favoritos (API)
  checkFavorite(carId: number): Observable<{ isFavorite: boolean }> {
    return this.http.get<{ isFavorite: boolean }>(`${this.apiUrl}/check/${carId}`);
  }

  // Toggle favorito
  toggleFavorite(carId: number): Observable<{ isFavorite: boolean; message: string }> {
    return this.http.post<{ isFavorite: boolean; message: string }>(
      `${this.apiUrl}/toggle/${carId}`,
      {}
    ).pipe(
      tap(response => {
        const currentIds = new Set(this.favoriteIds());
        if (response.isFavorite) {
          currentIds.add(carId);
        } else {
          currentIds.delete(carId);
        }
        this.favoriteIds.set(currentIds);
        // Recargar lista completa de favoritos
        this.loadFavorites();
      })
    );
  }

  // Agregar a favoritos
  addFavorite(carId: number): Observable<{ message: string; favoriteId: number }> {
    return this.http.post<{ message: string; favoriteId: number }>(this.apiUrl, { carId }).pipe(
      tap(() => {
        const currentIds = new Set(this.favoriteIds());
        currentIds.add(carId);
        this.favoriteIds.set(currentIds);
        this.loadFavorites();
      })
    );
  }

  // Eliminar de favoritos
  removeFavorite(carId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${carId}`).pipe(
      tap(() => {
        const currentIds = new Set(this.favoriteIds());
        currentIds.delete(carId);
        this.favoriteIds.set(currentIds);
        this.loadFavorites();
      })
    );
  }

  // Limpiar favoritos (para logout)
  clearFavorites(): void {
    this.favorites.set([]);
    this.favoriteIds.set(new Set());
  }
}
