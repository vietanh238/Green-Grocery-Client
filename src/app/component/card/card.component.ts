import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { CardModule } from 'primeng/card';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  imports: [CardModule, CommonModule],
  standalone: true,
})
export class CardComponent implements OnInit {
  @Input() product: any;
  @Input() availableStock?: number; // Stock available (trừ số lượng trong giỏ)
  @Output() addToCart = new EventEmitter<any>();
  ngOnInit(): void {}

  get stockDisplay(): number {
    return this.availableStock !== undefined ? this.availableStock : (this.product?.stock_quantity || 0);
  }

  get isOutOfStock(): boolean {
    return this.stockDisplay <= 0;
  }

  get isLowStock(): boolean {
    return this.stockDisplay > 0 && this.stockDisplay <= 5;
  }

  onAddToCart(event?: Event) {
    // Stop event propagation to prevent duplicate triggers
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    console.log('🛒 Card: onAddToCart called for', this.product.name);
    this.addToCart.emit(this.product);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }
}
