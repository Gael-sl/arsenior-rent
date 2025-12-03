import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent {
  menuOpen = signal(false);

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  toggleMenu(): void {
    this.menuOpen.update(value => !value);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  isHomePage(): boolean {
    const url = this.router.url.split('?')[0]; // Quitar query params
    return url === '/' || url === '' || url.startsWith('/#');
  }

  isMyReservationsPage(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/my-reservations';
  }

  logout(): void {
    this.authService.logout();
    this.menuOpen.set(false);
  }

  navigateTo(path: string): void {
    this.router.navigate([path]);
    this.menuOpen.set(false);
  }
}