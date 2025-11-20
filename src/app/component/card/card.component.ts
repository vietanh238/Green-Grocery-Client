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
  @Output() addToCart = new EventEmitter<any>();
  ngOnInit(): void {}

  onAddToCart() {
    this.addToCart.emit(this.product);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  }
}
