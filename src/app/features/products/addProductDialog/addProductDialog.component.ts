import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Select } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Service } from '../../../core/services/service';
import { ConstantDef } from '../../../core/constanDef';

interface Product {
  id?: number;
  name: string;
  sku: string;
  name_category: string;
  cost_price: number;
  price: number;
  unit: string;
  stock_quantity: number;
  barcode?: string;
  image?: string;
  category_id?: number;
}

@Component({
  selector: 'app-add-edit-product-dialog',
  templateUrl: './addEditProductDialog.component.html',
  styleUrl: './addEditProductDialog.component.scss',
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    Select,
    ToastModule,
  ],
  standalone: true,
})
export class AddEditProductDialogComponent implements OnInit {
  isEditMode: boolean = false;
  product: Product | null = null;
  lstCategory: any[] = [];
  lstUnit: any[] = [];

  productName: string = '';
  sku: string = '';
  costPrice: number = 0;
  price: number = 0;
  quantity: number = 0;
  unitSld: any = null;
  category: string = '';
  categorySld: any = null;
  barCode: string = '';
  productImage: string = '';
  selectedImageFile: File | null = null;

  errors: { [key: string]: boolean } = {};
  loading: boolean = false;
  costPriceDisplay: string = '';
  priceDisplay: string = '';

  constructor(
    public dialogRef: MatDialogRef<AddEditProductDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private service: Service,
    private message: MessageService
  ) {
    this.isEditMode = data.isEditMode || false;
    this.product = data.product || null;
    this.lstCategory = data.lstCategory || [];
    this.lstUnit = data.lstUnit || [];
  }

  ngOnInit(): void {
    if (this.isEditMode && this.product) {
      this.populateForm();
    }
  }

  populateForm(): void {
    if (!this.product) return;

    this.productName = this.product.name;
    this.sku = this.product.sku;
    this.costPrice = this.product.cost_price;
    this.price = this.product.price;
    this.quantity = this.product.stock_quantity;
    this.category = this.product.name_category;
    this.barCode = this.product.barcode || '';
    this.productImage = this.product.image || '';

    this.costPriceDisplay = this.formatNumberWithDots(this.costPrice.toString());
    this.priceDisplay = this.formatNumberWithDots(this.price.toString());

    const unit = this.lstUnit.find((u) => u.name === this.product?.unit);
    this.unitSld = unit || null;

    const category = this.lstCategory.find((c) => c.name === this.product?.name_category);
    this.categorySld = category || null;
  }

  onImageSelect(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.productImage = e.target.result;
        this.selectedImageFile = file;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.productImage = '';
    this.selectedImageFile = null;
  }

  inputPrice(event: any, fieldType: 'costPrice' | 'price'): void {
    const input = event.target;
    let value = input.value;

    const numericValue = value.replace(/[^\d]/g, '');
    if (numericValue === '') {
      this.setPriceValue(fieldType, 0);
      this.setPriceDisplay(fieldType, '');
      input.value = '';
      return;
    }

    this.setPriceValue(fieldType, parseInt(numericValue, 10));
    const displayValue = this.formatNumberWithDots(numericValue);
    this.setPriceDisplay(fieldType, displayValue);
    input.value = displayValue;

    setTimeout(() => {
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }, 0);
  }

  blurPrice(event: any, fieldType: 'costPrice' | 'price'): void {
    const input = event.target;
    const displayValue = this.getPriceDisplay(fieldType);

    if (displayValue && displayValue !== '0') {
      input.value = displayValue + ' VND';
    } else {
      input.value = '';
    }
  }

  focusPrice(event: any, fieldType: 'costPrice' | 'price'): void {
    const input = event.target;
    const displayValue = this.getPriceDisplay(fieldType);

    if (displayValue) {
      input.value = displayValue;
    } else {
      input.value = '';
    }

    setTimeout(() => {
      input.select();
    }, 0);
  }

  keydownPrice(event: KeyboardEvent): boolean {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
      'Tab',
      'Enter',
    ];

    if (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
      return true;
    }
    if (allowedKeys.includes(event.key)) {
      return true;
    }
    if (event.key >= '0' && event.key <= '9') {
      return true;
    }

    event.preventDefault();
    return false;
  }

  pastePrice(event: ClipboardEvent, fieldType: 'costPrice' | 'price'): void {
    event.preventDefault();

    const paste = event.clipboardData?.getData('text') || '';
    const numericPaste = paste.replace(/[^\d]/g, '');

    if (numericPaste) {
      const input = event.target as HTMLInputElement;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;

      const currentNumeric = this.getPriceDisplay(fieldType).replace(/\./g, '');
      const beforeCursor = currentNumeric.substring(0, start);
      const afterCursor = currentNumeric.substring(end);
      const newNumeric = beforeCursor + numericPaste + afterCursor;

      this.setPriceValue(fieldType, parseInt(newNumeric, 10) || 0);
      const displayValue = this.formatNumberWithDots(newNumeric);
      this.setPriceDisplay(fieldType, displayValue);
      input.value = displayValue;

      const newCursorPos = beforeCursor.length + numericPaste.length;
      setTimeout(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    }
  }

  changeCategory(): void {
    if (this.categorySld?.name) {
      this.category = this.categorySld.name;
      delete this.errors['category'];
    }
  }

  validate(): boolean {
    this.errors = {};

    if (!this.productName?.trim()) {
      this.errors['productName'] = true;
    }
    if (!this.sku?.trim()) {
      this.errors['sku'] = true;
    }
    if (!this.costPrice || this.costPrice <= 0) {
      this.errors['costPrice'] = true;
    }
    if (!this.price || this.price <= 0) {
      this.errors['price'] = true;
    }
    if (!this.quantity || this.quantity <= 0) {
      this.errors['quantity'] = true;
    }
    if (!this.unitSld) {
      this.errors['unit'] = true;
    }
    if (!this.category?.trim()) {
      this.errors['category'] = true;
    }
    if (!this.barCode?.trim()) {
      this.errors['barCode'] = true;
    }

    return Object.keys(this.errors).length === 0;
  }

  save(): void {
    if (!this.validate()) {
      this.showError('Vui lòng điền đầy đủ các trường bắt buộc');
      return;
    }

    this.loading = true;
    const params = {
      name: this.productName.trim(),
      sku: this.sku.trim(),
      cost_price: this.costPrice,
      price: this.price,
      stock_quantity: this.quantity,
      unit: this.unitSld.name,
      name_category: this.category.trim(),
      barcode: this.barCode.trim(),
      image: this.productImage,
    };

    // Uncomment when API is ready
    // const request = this.isEditMode && this.product?.id
    //   ? this.service.updateProduct(this.product.id, params)
    //   : this.service.createProduct(params);
    //
    // request.subscribe({
    //   next: (rs: any) => {
    //     this.loading = false;
    //     if (rs.status === ConstantDef.STATUS_SUCCESS) {
    //       this.showSuccess(this.isEditMode ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công');
    //       this.dialogRef.close(true);
    //     } else {
    //       this.showError('Lỗi giá trị nhập vào');
    //     }
    //   },
    //   error: (_error: any) => {
    //     this.loading = false;
    //     this.showError('Đã có lỗi xảy ra, vui lòng thử lại sau');
    //   },
    // });

    this.loading = false;
    this.showSuccess(this.isEditMode ? 'Cập nhật sản phẩm thành công' : 'Thêm sản phẩm thành công');
    this.dialogRef.close(true);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  private formatNumberWithDots(numericString: string): string {
    if (!numericString || numericString === '0') return '';
    const cleanNumber = numericString.replace(/^0+/, '') || '0';
    if (cleanNumber === '0') return '';
    return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private setPriceValue(fieldType: 'costPrice' | 'price', value: number): void {
    if (fieldType === 'costPrice') {
      this.costPrice = value;
    } else {
      this.price = value;
    }
  }

  private setPriceDisplay(fieldType: 'costPrice' | 'price', value: string): void {
    if (fieldType === 'costPrice') {
      this.costPriceDisplay = value;
    } else {
      this.priceDisplay = value;
    }
  }

  private getPriceDisplay(fieldType: 'costPrice' | 'price'): string {
    return fieldType === 'costPrice' ? this.costPriceDisplay : this.priceDisplay;
  }

  // API CALLS
  private showSuccess(detail: string): void {
    this.message.add({
      severity: 'success',
      summary: 'Thông báo',
      detail,
      life: 3000,
    });
  }

  private showError(detail: string): void {
    this.message.add({
      severity: 'error',
      summary: 'Thông báo',
      detail,
      life: 3000,
    });
  }
}
