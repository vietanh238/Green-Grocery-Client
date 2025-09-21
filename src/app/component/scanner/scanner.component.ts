import { Component, OnInit } from '@angular/core';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-scanner',
  templateUrl: './scanner.component.html',
  styleUrl: './scanner.component.scss',
  imports: [ZXingScannerModule, FormsModule, ButtonModule],
})
export class ScannerComponent implements OnInit {
  barcodeResult: string = '';
  availableDevices: MediaDeviceInfo[] = [];
  currentDevice: MediaDeviceInfo | undefined = undefined;

  allowedFormats = [
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.CODE_128,
    BarcodeFormat.EAN_8,
    BarcodeFormat.EAN_13,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.QR_CODE,
  ];

  constructor(private dialogRef: MatDialogRef<ScannerComponent>) {}

  ngOnInit(): void {
    this.barcodeResult = '';
  }
  onScanSuccess(result: string) {
    this.barcodeResult = result;
  }
  onCamerasFound(devices: MediaDeviceInfo[]) {
    this.availableDevices = devices;
    const backCam = devices.find((d) => /back|rear|environment/gi.test(d.label));
    this.currentDevice = backCam || devices[0];
  }
  resetBarcode() {
    this.barcodeResult = '';
  }
  closeDialog() {
    this.dialogRef.close();
  }

  save() {
    if (this.barcodeResult) {
      const value = this.barcodeResult.trim();
      this.dialogRef.close([value]);
    }
  }
}
