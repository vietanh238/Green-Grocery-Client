import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';

import { PanelModule } from 'primeng/panel';
import { ButtonModule } from 'primeng/button';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { Skeleton } from 'primeng/skeleton';

import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { CardComponent } from '../../component/card/card.component';
import { ScannerComponent } from '../../component/scanner/scanner.component';
import { PaymentQrDialogComponent } from '../../component/qrpay/qrpay.component';
import { AddManualOrder } from './addManualOrder/addManualOrder.component';
import { ConfirmDialogComponent } from '../../component/confirmDialog/confirmDialog.component';
import { DebitComponent } from './debit/debit.component';
import { CashPaymentComponent } from './cash-payment/cash-payment.component';

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
  @ViewChild('searchInput') searchInput?: ElementRef;

  products: Product[] = [];
  cartItems: CartItem[] = [];
  allProducts: Product[] = [];
  filteredProducts: Product[] = [];

  searchTerm = '';
  loading = false;
  isProcessingPayment = false;
  isProductNotFound = false;

  private paymentSuccessSubscription?: Subscription;
  private processingProducts = new Set<string>();

  constructor(
    private service: Service,
    private message: MessageService,
    private dialog: MatDialog
  ) {}

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Chỉ xử lý khi không đang nhập vào input/textarea
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    // Enter để thanh toán tiền mặt (khi có sản phẩm trong giỏ)
    if (event.key === 'Enter' && this.cartItems.length > 0 && !this.isProcessingPayment) {
      event.preventDefault();
      this.cashPayment();
      return;
    }

    // Escape để xóa giỏ hàng
    if (event.key === 'Escape' && this.cartItems.length > 0) {
      event.preventDefault();
      this.clearCart();
      return;
    }

    // Ctrl/Cmd + K để mở scanner
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.openScanner();
      return;
    }

    // Số 1-9 để set quick amount (chỉ khi đang ở dialog thanh toán)
    if (event.key >= '1' && event.key <= '9' && !event.ctrlKey && !event.metaKey) {
      // Logic này sẽ được xử lý trong cash-payment component
    }
  }

  ngOnInit(): void {
    this.restoreCart();
    this.loadProducts();
    this.subscribeToPaymentSuccess();
  }

  ngOnDestroy(): void {
    this.paymentSuccessSubscription?.unsubscribe();
    this.saveCartToStorage();
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

  loadProducts(): void {
    this.loading = true;
    this.service.getProducts().subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response.status === ConstantDef.STATUS_SUCCESS) {
          this.products = response.response.map((product: any) => ({
            ...product,
            original_stock_quantity: product.stock_quantity,
          }));
          this.allProducts = [...this.products];
          this.filteredProducts = [...this.products];
        } else {
          this.showNotification('error', 'Không thể tải danh sách sản phẩm');
        }
      },
      error: () => {
        this.loading = false;
        this.showNotification('error', 'Lỗi kết nối khi tải sản phẩm');
      },
    });
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

  handleAddToCart(product: Product): void {
    if (this.processingProducts.has(product.bar_code) || this.isProcessingPayment) {
      return;
    }

    // Tính stock available = stock hiện tại - số lượng đã có trong giỏ
    const existingItem = this.cartItems.find((item) => item.bar_code === product.bar_code);
    const quantityInCart = existingItem ? existingItem.quantity : 0;
    const availableStock = product.stock_quantity - quantityInCart;

    if (availableStock <= 0) {
      this.showNotification('error', 'Sản phẩm đã hết hàng hoặc đã thêm hết vào giỏ');
      return;
    }

    this.processingProducts.add(product.bar_code);

    try {
      if (existingItem) {
        existingItem.quantity++;
        this.showNotification('success', `Đã cập nhật số lượng ${product.name}`);
      } else {
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
        this.showNotification('success', `Đã thêm ${product.name} vào giỏ hàng`);
      }

      this.saveCartToStorage();
    } finally {
      setTimeout(() => {
        this.processingProducts.delete(product.bar_code);
      }, 300);
    }
  }

  increaseQuantity(item: CartItem): void {
    const product = this.findProductByBarcode(item.bar_code);
    if (!product) {
      this.showNotification('error', 'Không tìm thấy sản phẩm trong kho');
      return;
    }

    // Tính stock available = stock hiện tại - số lượng đã có trong giỏ
    const availableStock = product.stock_quantity - item.quantity;

    if (availableStock > 0) {
      item.quantity++;
      this.saveCartToStorage();
    } else {
      this.showNotification('error', `Chỉ còn ${product.stock_quantity} sản phẩm trong kho`);
    }
  }

  decreaseQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      item.quantity--;
      this.saveCartToStorage();
    } else {
      this.removeItem(item);
    }
  }

  updateQuantityDirectly(item: CartItem, event: any): void {
    const input = event.target;
    let newQuantity = parseInt(input.value, 10);

    if (isNaN(newQuantity) || newQuantity < 1) {
      input.value = item.quantity;
      this.showNotification('error', 'Số lượng phải lớn hơn 0');
      return;
    }

    newQuantity = Math.floor(newQuantity);

    const oldQuantity = item.quantity;
    const quantityDiff = newQuantity - oldQuantity;

    if (!item.isManual) {
      const product = this.findProductByBarcode(item.bar_code);
      if (!product) {
        input.value = oldQuantity;
        this.showNotification('error', 'Không tìm thấy sản phẩm trong kho');
        return;
      }

      // Tính stock available = stock hiện tại - số lượng đã có trong giỏ (trừ item hiện tại)
      const otherItemsQuantity = this.cartItems
        .filter(i => i.bar_code === item.bar_code && i !== item)
        .reduce((sum, i) => sum + i.quantity, 0);

      const availableStock = product.stock_quantity - otherItemsQuantity;

      if (quantityDiff > 0) {
        // Đang tăng số lượng
        if (availableStock < quantityDiff) {
          const maxQuantity = oldQuantity + availableStock;
          newQuantity = Math.max(oldQuantity, maxQuantity);
          input.value = newQuantity;
          if (availableStock <= 0) {
            this.showNotification('error', 'Sản phẩm đã hết hàng trong kho');
            item.quantity = oldQuantity; // Giữ nguyên số lượng cũ
            input.value = oldQuantity;
            return;
          } else {
            this.showNotification('warn', `Chỉ còn ${availableStock} sản phẩm trong kho. Đã tự động điều chỉnh số lượng.`);
          }
        }
      }
    }

    if (newQuantity !== oldQuantity) {
      item.quantity = newQuantity;
      input.value = newQuantity;
      this.saveCartToStorage();

      if (quantityDiff > 0) {
        this.showNotification('success', `Đã cập nhật số lượng ${item.name}`);
      } else if (quantityDiff < 0) {
        this.showNotification('info', `Đã giảm số lượng ${item.name}`);
      }
    } else {
      // Nếu không thay đổi, đảm bảo input hiển thị đúng
      input.value = oldQuantity;
    }
  }

  getMaxQuantity(item: CartItem): number {
    if (item.isManual) {
      return 9999;
    }

    const product = this.findProductByBarcode(item.bar_code);
    if (!product) {
      return item.quantity;
    }

    // Stock available = stock hiện tại - số lượng đã có trong giỏ (trừ item hiện tại)
    // Tìm tất cả items khác có cùng barcode
    const otherItemsQuantity = this.cartItems
      .filter(i => i.bar_code === item.bar_code && i !== item)
      .reduce((sum, i) => sum + i.quantity, 0);

    const availableStock = product.stock_quantity - otherItemsQuantity;
    return item.quantity + Math.max(0, availableStock);
  }

  getAvailableStock(product: Product): number {
    const existingItem = this.cartItems.find((item) => item.bar_code === product.bar_code);
    const quantityInCart = existingItem ? existingItem.quantity : 0;
    return Math.max(0, product.stock_quantity - quantityInCart);
  }

  isLowStock(product: Product): boolean {
    const availableStock = this.getAvailableStock(product);
    return availableStock > 0 && availableStock <= 5; // Cảnh báo khi còn <= 5
  }

  isOutOfStock(product: Product): boolean {
    return this.getAvailableStock(product) <= 0;
  }

  removeItem(item: CartItem): void {
    this.cartItems = this.cartItems.filter((i) => i.bar_code !== item.bar_code);
    this.saveCartToStorage();
    this.showNotification('success', 'Đã xóa sản phẩm khỏi giỏ hàng');
  }

  clearCart(): void {
    if (this.cartItems.length === 0) {
      this.showNotification('info', 'Giỏ hàng đã trống');
      return;
    }

    const dialog = this.dialog.open(ConfirmDialogComponent, {
      disableClose: true,
      data: {
        title: 'Xác nhận xóa giỏ hàng',
        buttons: [
          {
            label: 'Hủy',
            class: 'default',
            value: false,
            color: '',
            background: '',
          },
          {
            label: 'Xác nhận',
            class: 'primary',
            value: true,
            color: '',
            background: '',
          },
        ],
      },
    });
    dialog.afterClosed().subscribe((result: any) => {
      if (result) {
        this.resetCart();
        this.showNotification('success', 'Đã xóa toàn bộ giỏ hàng');
      }
    });
  }

  openScanner(): void {
    const dialogRef = this.dialog.open(ScannerComponent, {
      width: '400px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result: string) => {
      if (result) {
        this.handleBarcodeScanned(result);
      }
    });
  }

  private handleBarcodeScanned(barcode: string): void {
    this.searchTerm = barcode;
    this.filterProducts({ target: { value: barcode } });

    const product = this.allProducts.find((p) => p.bar_code === barcode);
    if (product) {
      // Tự động thêm vào giỏ hàng
      this.handleAddToCart(product);

      // Focus lại vào search input để sẵn sàng scan tiếp
      setTimeout(() => {
        if (this.searchInput) {
          this.searchInput.nativeElement.focus();
          this.searchInput.nativeElement.select();
        }
      }, 100);
    } else {
      this.showNotification('error', `Không tìm thấy sản phẩm với barcode: ${barcode}`);
      // Focus vào search input
      setTimeout(() => {
        if (this.searchInput) {
          this.searchInput.nativeElement.focus();
        }
      }, 100);
    }
  }

  addManualOrder(): void {
    const dialogRef = this.dialog.open(AddManualOrder, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-panel',
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        const existingItem = this.cartItems.find((item) => item.bar_code === result.bar_code);

        if (existingItem) {
          existingItem.quantity += result.quantity;
          this.showNotification('success', 'Đã cập nhật số lượng sản phẩm');
        } else {
          this.cartItems.push({
            ...result,
            isManual: true,
          });
          this.showNotification('success', `Đã thêm ${result.name} vào giỏ hàng`);
        }
        this.saveCartToStorage();
      }
    });
  }

  cashPayment(): void {
    if (this.cartItems.length === 0) {
      this.showNotification('error', 'Giỏ hàng trống');
      return;
    }

    if (this.isProcessingPayment) {
      return;
    }

    // Validate stock trước khi thanh toán
    const stockValidation = this.validateStockBeforePayment();
    if (!stockValidation.valid) {
      this.showNotification('error', stockValidation.message);
      // Reload products để cập nhật stock mới nhất
      this.loadProducts();
      return;
    }

    this.isProcessingPayment = true;
    const dialogRef = this.dialog.open(CashPaymentComponent, {
      width: '550px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-panel',
      disableClose: true,
      data: {
        totalAmount: this.totalAmount,
        cartItems: this.cartItems,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      this.isProcessingPayment = false;
      if (result?.success) {
        this.handlePaymentSuccess(result.data);
      }
    });
  }

  createPaymentQR(): void {
    if (this.cartItems.length === 0) {
      this.showNotification('error', 'Giỏ hàng trống');
      return;
    }

    if (this.isProcessingPayment) {
      return;
    }

    // Validate stock trước khi thanh toán
    const stockValidation = this.validateStockBeforePayment();
    if (!stockValidation.valid) {
      this.showNotification('error', stockValidation.message);
      this.loadProducts();
      return;
    }

    this.isProcessingPayment = true;
    const dialogRef = this.dialog.open(PaymentQrDialogComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-panel',
      data: {
        amount: this.totalAmount,
        cartItems: this.cartItems,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      this.isProcessingPayment = false;
      if (result?.success) {
        this.handlePaymentSuccess(result.data);
      } else if (result?.cancel) {
        this.showNotification('info', 'Đã hủy mã QR thanh toán');
      }
    });
  }

  createDebit(): void {
    if (this.cartItems.length === 0) {
      this.showNotification('error', 'Giỏ hàng trống');
      return;
    }

    if (this.isProcessingPayment) {
      return;
    }

    // Validate stock trước khi thanh toán
    const stockValidation = this.validateStockBeforePayment();
    if (!stockValidation.valid) {
      this.showNotification('error', stockValidation.message);
      this.loadProducts();
      return;
    }

    this.isProcessingPayment = true;
    const dialogRef = this.dialog.open(DebitComponent, {
      width: '500px',
      maxWidth: '95vw',
      panelClass: 'custom-dialog-panel',
      data: {
        totalAmount: this.totalAmount,
        cartItems: this.cartItems,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      this.isProcessingPayment = false;
      if (result?.success) {
        this.handlePaymentSuccess(result.data);
        this.showNotification('success', `Đã ghi nợ thành công cho ${result.customer.name}`);
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  private subscribeToPaymentSuccess(): void {
    this.paymentSuccessSubscription = this.service.paymentSuccess$.subscribe((data: any) => {
      if (data && data.success) {
        this.handlePaymentSuccess(data.data);
      }
    });
  }

  private handlePaymentSuccess(data: any): void {
    this.saveCartBackup();
    this.cartItems = [];
    this.clearCartFromStorage();
    // Reload products để cập nhật stock mới nhất sau khi thanh toán
    this.loadProducts();
    this.showNotification('success', 'Thanh toán thành công');
    this.clearCartBackupAfterDelay();
  }

  private findProductByBarcode(barCode: string): Product | undefined {
    return this.allProducts.find((p) => p.bar_code === barCode);
  }


  private resetCart(): void {
    this.cartItems = [];
    this.clearCartFromStorage();
  }

  private saveCartToStorage(): void {
    try {
      const cartData = {
        items: this.cartItems,
        timestamp: Date.now(),
      };
      localStorage.setItem('pos_cart_backup', JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }

  private restoreCart(): void {
    try {
      const cartBackup = localStorage.getItem('pos_cart_backup');
      if (cartBackup) {
        const data = JSON.parse(cartBackup);
        const hourInMs = 3600000;

        if (data.timestamp && Date.now() - data.timestamp < hourInMs) {
          this.cartItems = data.items || [];
          this.showNotification('info', 'Đã khôi phục giỏ hàng trước đó');
        } else {
          localStorage.removeItem('pos_cart_backup');
        }
      }
    } catch (error) {
      console.error('Error restoring cart:', error);
      localStorage.removeItem('pos_cart_backup');
    }
  }

  private clearCartFromStorage(): void {
    try {
      localStorage.removeItem('pos_cart_backup');
    } catch (error) {
      console.error('Error clearing cart from storage:', error);
    }
  }

  private saveCartBackup(): void {
    try {
      const backup = {
        items: [...this.cartItems],
        timestamp: Date.now(),
      };
      localStorage.setItem('pos_last_order_backup', JSON.stringify(backup));
    } catch (error) {
      console.error('Error saving cart backup:', error);
    }
  }

  private clearCartBackupAfterDelay(): void {
    setTimeout(() => {
      try {
        localStorage.removeItem('pos_last_order_backup');
      } catch (error) {
        console.error('Error clearing cart backup:', error);
      }
    }, 300000);
  }

  private validateStockBeforePayment(): { valid: boolean; message: string } {
    const invalidItems: string[] = [];

    for (const item of this.cartItems) {
      if (item.isManual) {
        continue; // Bỏ qua sản phẩm thủ công
      }

      const product = this.findProductByBarcode(item.bar_code);
      if (!product) {
        invalidItems.push(`${item.name} - Không tìm thấy sản phẩm`);
        continue;
      }

      if (product.stock_quantity < item.quantity) {
        invalidItems.push(
          `${item.name} - Chỉ còn ${product.stock_quantity} sản phẩm (yêu cầu: ${item.quantity})`
        );
      }
    }

    if (invalidItems.length > 0) {
      return {
        valid: false,
        message: `Không đủ hàng trong kho:\n${invalidItems.join('\n')}`,
      };
    }

    return { valid: true, message: '' };
  }

  private showNotification(severity: 'success' | 'error' | 'info' | 'warn', detail: string): void {
    const summaryMap = {
      success: 'Thành công',
      error: 'Lỗi',
      info: 'Thông tin',
      warn: 'Cảnh báo',
    };

    this.message.add({
      severity,
      summary: summaryMap[severity],
      detail,
      life: severity === 'error' ? 5000 : severity === 'warn' ? 4000 : 2000,
    });
  }
}
