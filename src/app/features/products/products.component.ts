import { Component, OnInit } from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { MatDialog } from '@angular/material/dialog';
import { AddProductDialog } from './addProductDialog/addProductDialog.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
  imports: [Dialog, ButtonModule, InputTextModule, FormsModule, Select, ZXingScannerModule],
  standalone: true,
})
export class ProductsComponent implements OnInit {
  constructor(private dialog: MatDialog) {}
  visible: boolean = false;
  category: any[] = [];
  categorySld: any;
  barcodeResult: string = '';
  currentDevice: MediaDeviceInfo | undefined = undefined;
  allowedFormats = [BarcodeFormat.EAN_13, BarcodeFormat.CODE_128, BarcodeFormat.QR_CODE];
  availableDevices: MediaDeviceInfo[] = [];

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
    this.category = [
      { name: 'New York', code: 'NY' },
      { name: 'Rome', code: 'RM' },
      { name: 'London', code: 'LDN' },
      { name: 'Istanbul', code: 'IST' },
      { name: 'Paris', code: 'PRS' },
    ];
  }
  onScanSuccess(result: string) {
    this.barcodeResult = result;
    console.log('Kết quả quét:', result);
  }
  onCamerasFound(devices: MediaDeviceInfo[]) {
    this.availableDevices = devices;
    console.log('Danh sách camera:', devices);

    // Ưu tiên chọn camera sau (nếu có)
    const backCam = devices.find((d) => /back|rear|environment/gi.test(d.label));
    this.currentDevice = backCam || devices[0];
  }
}
