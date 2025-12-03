import { Component, EventEmitter, Input, Output, signal, OnChanges, SimpleChanges, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AiService, CarSpecs } from '../../../services/ai.service';

@Component({
  selector: 'app-ai-specs-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-specs-modal.component.html',
  styleUrls: ['./ai-specs-modal.component.css']
})
export class AiSpecsModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() brand = '';
  @Input() model = '';
  @Input() year = 0;
  @Output() isOpenChange = new EventEmitter<boolean>();

  loading = signal(false);
  error = signal('');
  specs = signal<CarSpecs | null>(null);
  
  private isBrowser: boolean;
  private hasLoaded = false;

  constructor(
    private aiService: AiService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && !this.hasLoaded) {
      this.loadSpecs();
    }
    
    if (this.isBrowser) {
      if (this.isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    }
  }

  loadSpecs(): void {
    if (!this.brand || !this.model || !this.year) return;
    
    this.loading.set(true);
    this.error.set('');
    
    this.aiService.getCarSpecs(this.brand, this.model, this.year).subscribe({
      next: (response) => {
        this.specs.set(response.data);
        this.loading.set(false);
        this.hasLoaded = true;
      },
      error: (err) => {
        console.error('Error fetching AI specs:', err);
        this.error.set(err.error?.message || 'No se pudo obtener la informacion del vehiculo');
        this.loading.set(false);
      }
    });
  }

  retry(): void {
    this.hasLoaded = false;
    this.loadSpecs();
  }

  close(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    if (this.isBrowser) {
      document.body.style.overflow = '';
    }
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
