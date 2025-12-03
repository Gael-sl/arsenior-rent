import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ReservationsService } from '../../../services/reservations.service';
import QRCode from 'qrcode';
import { NavbarComponent } from '../../shared/navbar/navbar/navbar.component';
import { FooterComponent } from '../../shared/footer/footer/footer.component';

interface CardData {
  number: string;
  name: string;
  expiry: string;
  cvv: string;
}

type CardType = 'visa' | 'mastercard' | 'amex' | 'unknown';

interface CardValidation {
  type: CardType;
  isValid: boolean;
  errors: string[];
}

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    NavbarComponent,
    FooterComponent
  ],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.css']
})
export class CheckoutComponent implements OnInit {
  checkoutData: any = null;
  currentStep: 'payment' | 'success' = 'payment';
  
  // Payment
  paymentMethod: 'card' | 'store' = 'card';
  cardData: CardData = {
    number: '',
    name: '',
    expiry: '',
    cvv: ''
  };
  
  processing = signal(false);
  cardType: CardType = 'unknown';
  cardValidation: CardValidation = { type: 'unknown', isValid: false, errors: [] };
  
  // Success
  qrCodeUrl = signal('');
  reservationCode = '';
  depositAmount = 0;

  goBack(): void {
    this.location.back();
  }

  constructor(
    private reservationsService: ReservationsService,
    private router: Router,
    private location: Location
  ) {}

  ngOnInit(): void {
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Recuperar datos del checkout
    const data = localStorage.getItem('checkout_data');
    if (!data) {
      this.router.navigate(['/catalog']);
      return;
    }
    this.checkoutData = JSON.parse(data);
    this.depositAmount = Math.round(this.checkoutData.total * 0.3);
  }
  
  // Formatear fecha para mostrar
  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('es-MX', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  }

  detectCardType(cardNumber: string): CardType {
    const number = cardNumber.replace(/\s/g, '');
    
    // Visa: empieza con 4
    if (/^4/.test(number)) {
      return 'visa';
    }
    
    // Mastercard: empieza con 51-55 o 2221-2720
    if (/^5[1-5]/.test(number) || /^2(22[1-9]|2[3-9][0-9]|[3-6][0-9]{2}|7[0-1][0-9]|720)/.test(number)) {
      return 'mastercard';
    }
    
    // American Express: empieza con 34 o 37
    if (/^3[47]/.test(number)) {
      return 'amex';
    }
    
    return 'unknown';
  }

  validateCard(): CardValidation {
    const errors: string[] = [];
    const number = this.cardData.number.replace(/\s/g, '');
    const type = this.detectCardType(number);
    
    // Validar longitud según tipo
    if (type === 'amex' && number.length > 0 && number.length !== 15) {
      errors.push('American Express debe tener 15 dígitos');
    } else if (type !== 'amex' && type !== 'unknown' && number.length > 0 && number.length !== 16) {
      errors.push('La tarjeta debe tener 16 dígitos');
    }
    
    // Validar nombre
    if (this.cardData.name.length > 0 && this.cardData.name.length < 3) {
      errors.push('El nombre es muy corto');
    }
    
    // Validar fecha de expiración
    if (this.cardData.expiry.length === 5) {
      const [month, year] = this.cardData.expiry.split('/');
      const monthNum = parseInt(month);
      const yearNum = parseInt('20' + year);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      if (monthNum < 1 || monthNum > 12) {
        errors.push('Mes inválido');
      } else if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
        errors.push('La tarjeta está vencida');
      }
    }
    
    // Validar CVV según tipo
    if (type === 'amex' && this.cardData.cvv.length > 0 && this.cardData.cvv.length !== 4) {
      errors.push('CVV de American Express debe tener 4 dígitos');
    } else if (type !== 'amex' && this.cardData.cvv.length > 0 && this.cardData.cvv.length !== 3) {
      errors.push('CVV debe tener 3 dígitos');
    }
    
    const isValid = errors.length === 0 && 
                     number.length >= 15 && 
                     this.cardData.name.length >= 3 &&
                     this.cardData.expiry.length === 5 &&
                     ((type === 'amex' && this.cardData.cvv.length === 4) || 
                      (type !== 'amex' && this.cardData.cvv.length === 3));
    
    return { type, isValid, errors };
  }

  formatCardNumber(): void {
    // Remover espacios y caracteres no numéricos
    let value = this.cardData.number.replace(/\D/g, '');
    
    // Detectar tipo de tarjeta
    this.cardType = this.detectCardType(value);
    
    // Limitar longitud según tipo
    const maxLength = this.cardType === 'amex' ? 15 : 16;
    value = value.slice(0, maxLength);
    
    // Formatear según tipo de tarjeta
    let formatted = '';
    if (this.cardType === 'amex') {
      // AMEX: 4-6-5 (3456 789012 34567)
      formatted = value.match(/.{1,4}|.{1,6}|.{1,5}/g)?.join(' ') || value;
    } else {
      // Otros: 4-4-4-4
      formatted = value.match(/.{1,4}/g)?.join(' ') || value;
    }
    
    this.cardData.number = formatted;
    this.cardValidation = this.validateCard();
  }

  formatExpiry(): void {
    let value = this.cardData.expiry.replace(/\D/g, '');
    if (value.length >= 2) {
      value = value.slice(0, 2) + '/' + value.slice(2, 4);
    }
    this.cardData.expiry = value;
    this.cardValidation = this.validateCard();
  }

  onCvvInput(): void {
    // Limitar CVV según tipo de tarjeta
    const maxLength = this.cardType === 'amex' ? 4 : 3;
    this.cardData.cvv = this.cardData.cvv.replace(/\D/g, '').slice(0, maxLength);
    this.cardValidation = this.validateCard();
  }

  onNameInput(): void {
    // Convertir a mayúsculas y validar
    this.cardData.name = this.cardData.name.toUpperCase();
    this.cardValidation = this.validateCard();
  }

  isPaymentValid(): boolean {
    if (this.paymentMethod === 'card') {
      return this.validateCard().isValid;
    }
    return true; // Para pago en tienda siempre es válido
  }

  getCardTypeLabel(): string {
    switch (this.cardType) {
      case 'visa': return 'Visa';
      case 'mastercard': return 'Mastercard';
      case 'amex': return 'American Express';
      default: return '';
    }
  }

  async processPayment(): Promise<void> {
    this.processing.set(true);

    // Simular procesamiento de pago (2 segundos)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Crear reserva
    const reservationData = {
      carId: this.checkoutData.car.id,
      clientData: this.checkoutData.clientData,
      startDate: this.checkoutData.startDate,
      endDate: this.checkoutData.endDate,
      plan: this.checkoutData.plan,
      extras: this.checkoutData.extras,
      paymentMethod: this.paymentMethod,
      depositPaid: this.depositAmount,
      totalAmount: this.checkoutData.total
    };

    this.reservationsService.createReservation(reservationData).subscribe({
      next: async (reservation) => {
        this.processing.set(false);
        
        // Generar código de reserva
        this.reservationCode = `AR-${Date.now().toString().slice(-8).toUpperCase()}`;
        
        // Generar QR
        await this.generateQRCode();
        
        // Cambiar a pantalla de éxito
        this.currentStep = 'success';
        
        // Limpiar localStorage
        localStorage.removeItem('checkout_data');
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        this.processing.set(false);
        alert('Error al procesar el pago. Por favor intenta de nuevo.');
      }
    });
  }

  async generateQRCode(): Promise<void> {
    try {
      const qrData = JSON.stringify({
        code: this.reservationCode,
        car: `${this.checkoutData.car.brand} ${this.checkoutData.car.model}`,
        dates: `${this.checkoutData.startDate} - ${this.checkoutData.endDate}`,
        client: this.checkoutData.clientData.fullName,
        total: this.checkoutData.total,
        paid: this.depositAmount,
        pending: this.checkoutData.total - this.depositAmount
      });

      const qrUrl = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      this.qrCodeUrl.set(qrUrl);
    } catch (err) {
      console.error('Error generando QR:', err);
    }
  }

  downloadQR(): void {
    const link = document.createElement('a');
    link.href = this.qrCodeUrl();
    link.download = `arsenior-rent-${this.reservationCode}.png`;
    link.click();
  }
}