import { Component, OnInit, OnDestroy } from '@angular/core';
import { PanelModule } from 'primeng/panel';
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
import { AddManualOrder } from './addManualOrder/addManualOrder.component';
import { ConfirmDialogComponent } from '../../component/confirmDialog/confirmDialog.component';
import { DebitComponent } from './debit/debit.component';
import { Subscription } from 'rxjs';

interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  bar_code: string;
  stock_quantity?: number;
  unit?: string;
  cost_price?: number;
  isManual?: boolean;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  bar_code: string;
  price: number;
  stock_quantity: number;
  unit: string;
  cost_price: number;
  category?: any;
  supplier?: any;
  image?: string;
  description?: string;
}

@Component({
  selector: 'app-sell',
  templateUrl: './sell.component.html',
  styleUrl: './sell.component.scss',
  standalone: true,
  imports: [
    PanelModule,
    ButtonModule,
    FormsModule,
    InputGroupAddonModule,
    CardComponent,
    CommonModule,
    Skeleton,
  ],
})
export class SellComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  cartItems: CartItem[] = [];
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];
  isProductNotFound: boolean = false;
  searchTerm: string = '';
  loading: boolean = true;
  isProcessingPayment: boolean = false;
  private paymentSuccessSubscription?: Subscription;

  constructor(
    private service: Service,
    private message: MessageService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.subscribeToPaymentSuccess();
  }

  ngOnDestroy(): void {
    this.paymentSuccessSubscription?.unsubscribe();
  }

  private subscribeToPaymentSuccess(): void {
    // Websocket subscription for real-time payment updates
    this.paymentSuccessSubscription = this.service.paymentSuccess$.subscribe((data: any) => {
      if (data && data.success) {
        this.handlePaymentSuccess(data.data);
      }
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.service.getProducts().subscribe(
      (rs: any) => {
        this.loading = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.products = rs.response.map((product: any) => ({
            ...product,
            original_stock_quantity: product.stock_quantity,
          }));
          this.allProducts = [...this.products];
          this.filteredProducts = [...this.products];
        } else {
          this.showError('Không thể tải danh sách sản phẩm');
        }
      },
      (error: any) => {
        this.loading = false;
        this.showError('Lỗi kết nối khi tải sản phẩm');
      }
    );
  }

  get totalAmount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  get productsCount(): number {
    return this.filteredProducts?.length || 0;
  }

  get cartItemsCount(): number {
    return this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  get totalItemsCount(): number {
    return this.cartItems.length;
  }

  increaseQuantity(item: CartItem): void {
    const product = this.findProductByBarcode(item.bar_code);
    if (!product) {
      this.showError('Không tìm thấy sản phẩm trong kho');
      return;
    }

    if (product.stock_quantity > 0) {
      item.quantity++;
      this.updateProductStock(product.bar_code, -1);
    } else {
      this.showError('Sản phẩm đã hết hàng trong kho');
    }
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      item.quantity--;
      this.updateProductStock(item.bar_code, 1);
    } else {
      this.removeItem(item);
    }
  }

  removeItem(item: CartItem): void {
    this.updateProductStock(item.bar_code, item.quantity);
    this.cartItems = this.cartItems.filter((i) => i.bar_code !== item.bar_code);
    this.showSuccess('Đã xóa sản phẩm khỏi giỏ hàng');
  }

  handleAddToCart(product: Product): void {
    // Prevent double-click
    if (this.isProcessingPayment) {
      return;
    }

    if (product.stock_quantity <= 0) {
      this.showError('Sản phẩm đã hết hàng');
      return;
    }

    const existingItem = this.cartItems.find((item) => item.bar_code === product.bar_code);

    if (existingItem) {
      // Only increase if stock allows
      if (product.stock_quantity > 0) {
        existingItem.quantity++;
        this.updateProductStock(product.bar_code, -1);
        this.showSuccess(`Đã cập nhật số lượng ${product.name}`);
      } else {
        this.showError('Sản phẩm đã hết hàng trong kho');
      }
    } else {
      // Add new item to cart
      this.cartItems.push({
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        sku: product.sku,
        bar_code: product.bar_code,
        stock_quantity: product.stock_quantity,
        unit: product.unit,
        cost_price: product.cost_price,
      });
      this.updateProductStock(product.bar_code, -1);
      this.showSuccess(`Đã thêm ${product.name} vào giỏ hàng`);
    }
  }

  filterProducts(event: any): void {
    const value = event.target.value.toLowerCase().trim();
    this.searchTerm = value;

    if (!value) {
      this.filteredProducts = [...this.allProducts];
      this.isProductNotFound = false;
      return;
    }

    this.filteredProducts = this.allProducts.filter(
      (product: Product) =>
        product.name.toLowerCase().includes(value) ||
        product.sku.toLowerCase().includes(value) ||
        product.bar_code.includes(value)
    );

    this.isProductNotFound = this.filteredProducts.length === 0;
  }

  openScanner(): void {
    const dialogRef = this.dialog.open(ScannerComponent, {
      width: '400px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (result) {
        this.searchTerm = result;
        this.filterProducts({ target: { value: result } });

        // Auto add to cart if product found
        const product = this.allProducts.find((p) => p.bar_code === result);
        if (product) {
          this.handleAddToCart(product);
        }
      }
    });
  }

  addManualOrder(): void {
    const dialogRef = this.dialog.open(AddManualOrder, {
      width: '500px',
      maxWidth: '95vw',
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        const existingItem = this.cartItems.find((item) => item.bar_code === result.bar_code);

        if (existingItem) {
          existingItem.quantity += result.quantity;
          this.showSuccess('Đã cập nhật số lượng sản phẩm');
        } else {
          this.cartItems.push({
            ...result,
            isManual: true,
          });
          this.showSuccess(`Đã thêm ${result.name} vào giỏ hàng`);
        }
      }
    });
  }

  clearCart(): void {
    if (this.cartItems.length === 0) {
      this.showInfo('Giỏ hàng đã trống');
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Xác nhận xóa giỏ hàng',
        message: 'Bạn có chắc chắn muốn xóa toàn bộ giỏ hàng?',
        confirmText: 'Xóa',
        cancelText: 'Hủy',
      },
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.resetCart();
        this.showSuccess('Đã xóa toàn bộ giỏ hàng');
      }
    });
  }

  cashPayment(): void {
    if (this.cartItems.length === 0) {
      this.showError('Giỏ hàng trống');
      return;
    }

    if (this.isProcessingPayment) {
      return;
    }

    this.isProcessingPayment = true;

    const paymentData = {
      amount: this.totalAmount,
      items: this.cartItems.map((item) => ({
        bar_code: item.bar_code,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      })),
      payment_method: 'cash',
    };

    this.service.cashPayment(paymentData).subscribe(
      (rs: any) => {
        this.isProcessingPayment = false;
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.handlePaymentSuccess(rs.response);
          this.showSuccess('Thanh toán tiền mặt thành công');
        } else {
          const errorMsg = rs.response?.error_message_vn || rs.response?.error_message_us || rs.error_message || 'Thanh toán thất bại';
          this.showError(errorMsg);
        }
      },
      (error: any) => {
        this.isProcessingPayment = false;
        const errorMsg = error?.error?.response?.error_message_vn ||
                        error?.error?.response?.error_message_us ||
                        error?.error?.message ||
                        'Lỗi kết nối khi thanh toán';
        this.showError(errorMsg);
      }
    );
  }

  createPaymentQR(): void {
    if (this.cartItems.length === 0) {
      this.showError('Giỏ hàng trống');
      return;
    }

    const dialogRef = this.dialog.open(PaymentQrDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: {
        amount: this.totalAmount,
        cartItems: this.cartItems,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.success) {
        this.handlePaymentSuccess(result.data);
      } else if (result?.cancel) {
        this.showInfo('Đã hủy mã QR thanh toán');
      }
    });
  }

  createDebit(): void {
    if (this.cartItems.length === 0) {
      this.showError('Giỏ hàng trống');
      return;
    }

    const dialogRef = this.dialog.open(DebitComponent, {
      width: '500px',
      maxWidth: '95vw',
      data: {
        totalAmount: this.totalAmount,
        cartItems: this.cartItems,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result?.success) {
        this.handlePaymentSuccess(result.data);
        this.showSuccess(`Đã ghi nợ thành công cho ${result.customer.name}`);
      }
    });
  }

  private handlePaymentSuccess(paymentData: any): void {
    // Reset cart and update product stocks
    this.cartItems = [];

    // Reload products to get updated stock quantities
    this.loadProducts();

    // Show success message with transaction details
    if (paymentData.order_code) {
      this.showSuccess(`Thanh toán thành công - Mã đơn: ${paymentData.order_code}`);
    } else {
      this.showSuccess('Thanh toán thành công');
    }
  }

  private findProductByBarcode(barCode: string): Product | undefined {
    return this.allProducts.find((p) => p.bar_code === barCode);
  }

  private updateProductStock(barCode: string, delta: number): void {
    const product = this.allProducts.find((p) => p.bar_code === barCode);
    if (product) {
      product.stock_quantity = Math.max(0, product.stock_quantity + delta);
    }

    const filteredProduct = this.filteredProducts.find((p) => p.bar_code === barCode);
    if (filteredProduct) {
      filteredProduct.stock_quantity = Math.max(0, filteredProduct.stock_quantity + delta);
    }
  }

  private resetCart(): void {
    this.cartItems.forEach((item) => {
      if (!item.isManual) {
        this.updateProductStock(item.bar_code, item.quantity);
      }
    });
    this.cartItems = [];
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  private showSuccess(message: string): void {
    this.message.add({
      severity: 'success',
      summary: 'Thành công',
      detail: message,
      life: 3000,
    });
  }

  private showError(message: string): void {
    this.message.add({
      severity: 'error',
      summary: 'Lỗi',
      detail: message,
      life: 5000,
    });
  }

  private showInfo(message: string): void {
    this.message.add({
      severity: 'info',
      summary: 'Thông tin',
      detail: message,
      life: 3000,
    });
  }
}
