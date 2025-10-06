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
import { MatDialog } from '@angular/material/dialog';
import { ScannerComponent } from '../../component/scanner/scanner.component';
import { Skeleton } from 'primeng/skeleton';
import { PaymentQrDialogComponent } from '../../component/qrpay/qrpay.component';

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
    Skeleton,
  ],
})
export class SellComponent implements OnInit {
  products: any[] = [];
  cartItems: CartItem[] = [];
  allProducts: any[] = [];

  constructor(
    private service: Service,
    private message: MessageService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.service.getProducts().subscribe(
      (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.products = rs.response;
          this.allProducts = this.products;
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

  createPaymentQR() {
    const dialogRef = this.dialog.open(PaymentQrDialogComponent, {
      disableClose: true,
      data: {
        amount: this.totalAmount,
      },
    });
    // dialogRef.afterClosed().subscribe((result: any) => {
    //   if (result) {
    //     this.filterData(result[0]);
    //   }
    // });
  }

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

  filterProducts(event: any): void {
    const value = event.target.value;
    if (value) {
      const keyFilter: string = String(value.trim()).toLowerCase();
      this.filterData(keyFilter);
    } else {
      const keyFilter: string = String(value.trim()).toLowerCase();
      this.filterData(keyFilter);
    }
  }

  private normalize(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }
  openScanner() {
    const dialogRef = this.dialog.open(ScannerComponent, {});
    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.filterData(result[0]);
      }
    });
  }

  filterData(keyFilter: string): void {
    if (keyFilter) {
      this.products = this.allProducts.filter(
        (item: any) =>
          this.normalize(item.name)?.includes(keyFilter) ||
          item?.sku?.toLowerCase()?.includes(keyFilter) ||
          item?.bar_code?.includes(keyFilter)
      );
    } else {
      this.products = [...this.allProducts];
    }
  }
}
