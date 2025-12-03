import { HttpInterceptorFn } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  
  // Solo en el navegador
  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('arsenior_token');
    
    // DEBUG - quitar después
    if (req.url.includes('/favorites')) {
      console.log('🔐 Interceptor - URL:', req.url);
      console.log('🔐 Interceptor - Token existe:', !!token);
      console.log('🔐 Interceptor - Token:', token ? token.substring(0, 20) + '...' : 'null');
    }
    
    if (token) {
      const clonedReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next(clonedReq);
    }
  }
  
  return next(req);
};