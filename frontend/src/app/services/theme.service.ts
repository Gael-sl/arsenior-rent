import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'arsenior-theme';
  private platformId = inject(PLATFORM_ID);
  
  isDarkMode = signal<boolean>(false);

  constructor() {
    // Solo ejecutar en el navegador
    if (isPlatformBrowser(this.platformId)) {
      // Cargar preferencia guardada
      const savedTheme = localStorage.getItem(this.THEME_KEY);
      if (savedTheme) {
        this.isDarkMode.set(savedTheme === 'dark');
      } else {
        // Detectar preferencia del sistema
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.isDarkMode.set(prefersDark);
      }
      
      // Aplicar tema inicial
      this.applyTheme();
      
      // Efecto para aplicar cambios automáticamente
      effect(() => {
        this.applyTheme();
      });
    }
  }

  toggleTheme(): void {
    this.isDarkMode.update(value => !value);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.THEME_KEY, this.isDarkMode() ? 'dark' : 'light');
    }
  }

  private applyTheme(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    const html = document.documentElement;
    if (this.isDarkMode()) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }
}
