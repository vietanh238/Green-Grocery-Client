import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { QRCodeComponent } from 'angularx-qrcode';
import { Service } from '../../core/services/service';
import { Router } from '@angular/router';
import { ConstantDef } from '../../core/constanDef';
import { MessageService } from 'primeng/api';

interface BankInfo {
  bankName: string;
  accountName: string;
  accountNumber: string;
  bankId: string;
}

@Component({
  selector: 'app-payment-qr-dialog',
  templateUrl: './qrpay.component.html',
  styleUrl: './qrpay.component.scss',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
})
export class PaymentQrDialogComponent implements OnInit, OnDestroy {
  @Input() transferContent: string = '';

  bankInfo: BankInfo = {
    bankName: 'Vietcombank',
    accountName: 'DUONG VIET ANH',
    accountNumber: '1019466120',
    bankId: '970436',
  };

  private readonly VIETQR_BASE_URL = 'https://img.vietqr.io/image';
  private readonly QR_TEMPLATE = 'compact2';

  qrCodeUrl: string = '';
  transactionCode: string = '';
  remainingTime: number = 300;
  isLoadingQR: boolean = true;
  qrLoaded: boolean = false;
  amount: number = 0;
  items: any[] = [];

  private timerInterval: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private dialogRef: MatDialogRef<PaymentQrDialogComponent>,
    private service: Service,
    private router: Router,
    private message: MessageService
  ) {
    this.amount = data.amount;
    this.items = data.items || [];
  }
  ngOnInit() {
    this.transactionCode = this.generateTransactionCode();
    this.generateVietQRUrl();
    this.startTimer();
  }

  ngOnDestroy() {
    this.clearTimer();
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
  generateVietQRUrl() {
    this.isLoadingQR = true;
    this.qrLoaded = false;

    // const baseUrl = `${this.VIETQR_BASE_URL}/${this.bankInfo.bankId}-${this.bankInfo.accountNumber}-${this.QR_TEMPLATE}.jpg`;

    // const params = new URLSearchParams({
    //   amount: this.amount.toString(),
    //   addInfo: this.transferContent || this.transactionCode,
    //   accountName: this.bankInfo.accountName,
    // });
    // this.qrCodeUrl = `${baseUrl}?${params.toString()}`;

    // use qr code of payos
    const orderCode = Date.now();
    const params = {
      orderCode: orderCode,
      amount: this.amount,
      description: this.transactionCode,
      cancelUrl: this.router.url,
      returnUrl: this.router.url,
      items: this.items,
    };

    this.service.createPayment(params).subscribe(
      (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.qrCodeUrl = rs.response.qrCode;
        } else {
          this.showError('Không thể tạo mã');
        }
      },
      (_error: any) => {
        this.showError('Lỗi hệ thống');
      }
    );

    this.onImageLoad();
  }

  generateTransactionCode(): string {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TXN${timestamp}${random}`;
  }

  onImageLoad() {
    this.isLoadingQR = false;
    this.qrLoaded = true;
  }

  onImageError() {
    this.isLoadingQR = false;
    this.qrLoaded = false;
    console.error('Không thể tải mã QR từ VietQR');
  }

  startTimer() {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.remainingTime--;
      if (this.remainingTime <= 0) {
        this.clearTimer();
        this.closeDialog();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  async copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Đã sao chép số tài khoản');
    } catch (error) {
      console.error('Không thể sao chép:', error);
    }
  }

  async downloadQR() {
    if (!this.qrCodeUrl || !this.qrLoaded) {
      alert('Mã QR chưa sẵn sàng');
      return;
    }

    try {
      const response = await fetch(this.qrCodeUrl);
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `VietQR_Payment_${this.transactionCode}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      alert('Đã tải xuống mã QR');
    } catch (error) {
      console.error('Download error:', error);
      alert('Không thể tải xuống. Vui lòng thử lại!');
    }
  }

  closeDialog() {
    this.clearTimer();
    this.dialogRef.close();
  }

  updateBankInfo(bankInfo: Partial<BankInfo>) {
    this.bankInfo = { ...this.bankInfo, ...bankInfo };
    this.generateVietQRUrl();
  }
}
