import { Component, OnInit } from '@angular/core';
import { PanelModule } from 'primeng/panel';
import { InputGroup } from 'primeng/inputgroup';
import { ButtonModule } from 'primeng/button';
import { FormsModule } from '@angular/forms';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { CardComponent } from '../../component/card/card.component';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  sku: string;
}

@Component({
  selector: 'app-sell',
  templateUrl: './sell.component.html',
  styleUrl: './sell.component.scss',
  standalone: true,
  imports: [
    PanelModule,
    InputGroup,
    ButtonModule,
    FormsModule,
    InputGroupAddonModule,
    CardComponent,
    CommonModule,
  ],
})
export class SellComponent implements OnInit {
  products: any[] = [];
  cartItems: CartItem[] = [];

  constructor(private service: Service, private message: MessageService) {}

  ngOnInit(): void {
    this.service.getProducts().subscribe(
      (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.products = rs.response;
        }
      },
      (_error: any) => {
        this.showError('Lỗi hệ thống');
      }
    );
  }

  get totalAmount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  increaseQuantity(item: CartItem) {
    item.quantity++;
  }

  decreaseQuantity(item: CartItem) {
    if (item.quantity > 1) {
      item.quantity--;
    }
  }

  removeItem(item: CartItem) {
    this.cartItems = this.cartItems.filter((i) => i.sku !== item.sku);
    this.showSuccess('Đã xóa sản phẩm khỏi giỏ hàng');
  }

  createPaymentQR() {}

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  private showError(detail: string) {
    this.message.add({
      severity: 'error',
      summary: 'Thông báo',
      detail,
      life: 1000,
    });
  }

  private showSuccess(detail: string) {
    this.message.add({
      severity: 'success',
      summary: 'Thành công',
      detail,
      life: 1000,
    });
  }

  handleAddToCart(product: any) {
    const existing = this.cartItems.find((item) => item.sku === product.sku);
    if (existing) {
      existing.quantity += 1;
    } else {
      this.cartItems.push({ ...product, quantity: 1 });
    }
  }
}
