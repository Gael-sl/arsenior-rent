import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center justify-center" [style.height.px]="size">
      <div class="loading"></div>
      @if (message) {
        <p class="ml-4 text-gray-600">{{ message }}</p>
      }
    </div>
  `,
  styles: []
})
export class LoadingSpinnerComponent {
  @Input() size: number = 200;
  @Input() message: string = '';
}