import { Component, OnInit } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { AddProductDialog } from './addProductDialog/addProductDialog.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ScannerComponent } from '../../component/scanner/scanner.component';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
declare var $: any;

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  imports: [Dialog, ButtonModule, InputTextModule, FormsModule, Select],
  standalone: true,
})
export class ProductsComponent implements OnInit {
  visible: boolean = false;
  categorySld: any;
  barCode: string = '';
  productName: string = '';
  sku: string = '';
  importPrice: Number = 0;
  sellingPrice: any;
  quantity: Number = 0;
  unitId: Number = -1;
  unitSld: any;
  category: string = '';
  lstCategory: any[] = [];
  lstUnit: any[] = [];
  displayPrice: string = '';
  isHasError: boolean = false;

  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.getListCategory();
  }

  showDialog() {
    this.visible = true;
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
      this.resetInput();
    }
  }

  resetInput() {
    this.productName = '';
    this.sku = '';
    this.importPrice = 0;
    this.sellingPrice = 0;
    this.quantity = 0;
    this.unitSld = undefined;
    this.category = '';
    this.barCode = '';
  }

  inputNumber(key: KeyboardEvent) {
    if (key.key === 'e') {
      key.preventDefault();
    }
  }

  transformCurrency(event: any) {
    const value = event.target.value;
    if (value == null || value === '') return '';
    const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
    const val = num.toLocaleString('vi-VN') + ' VND';
    $('#sellingPrice').val(val);
    return num.toLocaleString('vi-VN') + ' VND';
  }
  focusInp() {
    $('#sellingPrice').val(this.sellingPrice);
  }
  input(event: any) {}

  validate() {
    if (!this.productName) {
      this.isHasError = true;
      $('#productName').addClass('invalid');
    }
    if (!this.sku) {
      this.isHasError = true;
      $('#sku').addClass('invalid');
    }
    if (!this.importPrice) {
      this.isHasError = true;
      $('#importPrice').addClass('invalid');
    }
    if (!this.sellingPrice) {
      this.isHasError = true;
      $('#sellingPrice').addClass('invalid');
    }
    if (!this.quantity) {
      this.isHasError = true;
      $('#quantity').addClass('invalid');
    }
    if (!this.unitSld) {
      console.log(this.unitSld);

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
    $('#importPrice').removeClass('invalid');
    $('#sellingPrice').removeClass('invalid');
    $('#quantity').removeClass('invalid');
    $('#unit').removeClass('invalid');
    $('#category').removeClass('invalid');
    $('#barCode').removeClass('invalid');
  }
}
