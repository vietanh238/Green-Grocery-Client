import { Component, OnInit } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { AddProductDialog } from './addProductDialog/addProductDialog.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ScannerComponent } from '../../component/scanner/scanner.component';
import { TableModule } from 'primeng/table';
import { CommonModule } from '@angular/common';

import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { Service } from '../../core/services/service';
import { ConstantDef } from '../../core/constanDef';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
declare var $: any;

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  imports: [
    Dialog,
    ButtonModule,
    InputTextModule,
    FormsModule,
    Select,
    ToastModule,
    TableModule,
    CommonModule,
  ],
  standalone: true,
})
export class ProductsComponent implements OnInit {
  visible: boolean = false;
  categorySld: any;
  barCode: string = '';
  productName: string = '';
  sku: string = '';
  costPrice: number = 0;
  price: number = 0;
  quantity: number = 0;
  unitId: number = -1;
  unitSld: any;
  category: string = '';
  lstCategory: any[] = [];
  lstUnit: any[] = [];
  isHasError: boolean = false;
  costPriceDisplay: string = '';
  priceDisplay: string = '';
  products!: any[];

  constructor(
    private dialog: MatDialog,
    private service: Service,
    private message: MessageService
  ) {}

  ngOnInit(): void {
    this.getProducts();
    this.getListCategory();
  }

  showDialog() {
    this.visible = true;
    this.service.getCategories().subscribe(
      (data: any) => {
        if (data.status === ConstantDef.STATUS_SUCCESS) {
          let listCategory = data.response.data;
          listCategory = listCategory.map((item: any) => {
            return {
              name: item.name,
              code: item.id,
            };
          });
          this.lstCategory = listCategory;
        } else {
        }
      },
      (_error: any) => {
        this.message.add({
          severity: 'error',
          summary: 'Thông báo',
          detail: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
          life: 1000,
        });
      }
    );
  }

  openAddProductDialog() {
    const dialogRef = this.dialog.open(AddProductDialog, {
      height: '400px',
      width: '600px',
    });
  }

  getListCategory() {
    this.lstUnit = [
      { name: 'Lon', code: 0 },
      { name: 'Chai', code: 1 },
      { name: 'Hộp', code: 2 },
      { name: 'Gói', code: 3 },
      { name: 'Vỉ', code: 4 },
      { name: 'Cây', code: 5 },
      { name: 'Quả', code: 6 },
      { name: 'Bịch', code: 7 },
      { name: 'Gram', code: 8 },
      { name: 'Kilogram', code: 9 },
      { name: 'Lạng', code: 10 },
      { name: 'Mililít', code: 11 },
      { name: 'Lít', code: 12 },
      { name: 'Thùng', code: 13 },
      { name: 'Bao', code: 14 },
      { name: 'Bó', code: 15 },
    ];
  }

  openScanner() {
    this.visible = false;
    const dialogRef = this.dialog.open(ScannerComponent, {});

    dialogRef.afterClosed().subscribe((result: any) => {
      this.visible = true;
      if (result) {
        this.barCode = result[0];
      }
    });
  }

  save() {
    this.resetError();
    this.validate();
    if (!this.isHasError) {
      this.visible = false;
      let params = {
        productName: this.productName,
        sku: this.sku,
        costPrice: this.costPrice,
        price: this.price,
        quantity: $('#quantity').val(),
        unit: this.unitSld.name,
        category: this.category,
        barCode: this.barCode,
      };

      this.service.createProduct(params).subscribe(
        (data: any) => {
          if (data.status === ConstantDef.STATUS_SUCCESS) {
            this.resetInput();
            this.message.add({
              severity: 'success',
              summary: 'Thông báo',
              detail: 'Thêm sản phẩm thành công',
              life: 1000,
            });
          } else {
            // error_data = data.response
            this.message.add({
              severity: 'error',
              summary: 'Thông báo',
              detail: 'Lỗi giá trị nhập',
              life: 1000,
            });
          }
        },
        (_error) => {
          this.message.add({
            severity: 'error',
            summary: 'Thông báo',
            detail: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
            life: 1000,
          });
        }
      );
    }
  }

  resetInput() {
    this.productName = '';
    this.sku = '';
    this.resetPriceField('costPrice');
    this.resetPriceField('price');
    this.quantity = 0;
    this.unitSld = undefined;
    this.category = '';
    this.barCode = '';
  }

  validate() {
    const quantity = $('#quantity').val();
    if (!this.productName) {
      this.isHasError = true;
      $('#productName').addClass('invalid');
    }
    if (!this.sku) {
      this.isHasError = true;
      $('#sku').addClass('invalid');
    }
    if (!this.costPrice || this.costPrice <= 0) {
      this.isHasError = true;
      $('#costPrice').addClass('invalid');
    }
    if (!this.price || this.price <= 0) {
      this.isHasError = true;
      $('#price').addClass('invalid');
    }
    if (!quantity) {
      this.isHasError = true;
      $('#quantity').addClass('invalid');
    }
    if (!this.unitSld) {
      this.isHasError = true;
      $('#unit').addClass('invalid');
    }
    if (!this.category) {
      this.isHasError = true;
      $('#category').addClass('invalid');
    }
    if (!this.barCode) {
      this.isHasError = true;
      $('#barCode').addClass('invalid');
    }
  }

  resetError() {
    this.isHasError = false;
    $('#productName').removeClass('invalid');
    $('#sku').removeClass('invalid');
    $('#costPrice').removeClass('invalid');
    $('#price').removeClass('invalid');
    $('#quantity').removeClass('invalid');
    $('#unit').removeClass('invalid');
    $('#category').removeClass('invalid');
    $('#barCode').removeClass('invalid');
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

  private formatNumberWithDots(numericString: string): string {
    if (!numericString || numericString === '0') return '';
    const cleanNumber = numericString.replace(/^0+/, '') || '0';
    if (cleanNumber === '0') return '';
    return cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  private setPriceValue(fieldType: 'costPrice' | 'price', value: number): void {
    this[fieldType] = value;
  }

  private setPriceDisplay(fieldType: 'costPrice' | 'price', value: string): void {
    const displayField = (fieldType + 'Display') as 'costPriceDisplay' | 'priceDisplay';
    this[displayField] = value;
  }

  private getPriceDisplay(fieldType: 'costPrice' | 'price'): string {
    const displayField = (fieldType + 'Display') as 'costPriceDisplay' | 'priceDisplay';
    return this[displayField];
  }

  private resetPriceField(fieldType: 'costPrice' | 'price'): void {
    this.setPriceValue(fieldType, 0);
    this.setPriceDisplay(fieldType, '');
  }

  blurValidate(event: any, idItem: string) {
    const value = event.target.value;
    const id = idItem;

    if (value) {
      $(`#${id}`).removeClass('invalid');
    }
  }

  onSelectChange(event: any, idItem: string) {
    if (event.value?.name) {
      $(`#${idItem}`).removeClass('invalid');
    }
  }

  changeCategory() {
    if (this.categorySld?.name) {
      this.category = this.categorySld.name;
    }
  }

  getProducts() {
    this.service.getProducts().subscribe({
      next: (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.products = rs.response;
        } else {
          this.showError('Đã có lỗi xảy ra, vui lòng thử lại sau');
        }
      },
      error: (_error: any) => {
        this.showError('Lỗi hệ thống');
      },
    });
  }

  private showError(detail: string) {
    this.message.add({
      severity: 'error',
      summary: 'Thông báo',
      detail,
      life: 1000,
    });
  }
}
