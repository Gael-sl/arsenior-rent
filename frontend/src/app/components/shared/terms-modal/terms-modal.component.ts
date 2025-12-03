import { Component, EventEmitter, Input, Output, signal, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-terms-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms-modal.component.html',
  styleUrls: ['./terms-modal.component.css']
})
export class TermsModalComponent {
  @Input() isOpen = false;
  @Output() isOpenChange = new EventEmitter<boolean>();
  @Output() accepted = new EventEmitter<void>();

  hasScrolledToEnd = signal(false);
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  close(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  acceptTerms(): void {
    this.accepted.emit();
    this.close();
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const scrollHeight = element.scrollHeight;
    
    // User has scrolled to within 50px of the bottom
    if (scrollHeight - scrollPosition < 50) {
      this.hasScrolledToEnd.set(true);
    }
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  ngOnChanges(): void {
    if (this.isBrowser) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
        this.hasScrolledToEnd.set(false);
      } else {
        document.body.style.overflow = '';
      }
    }
  }
}
