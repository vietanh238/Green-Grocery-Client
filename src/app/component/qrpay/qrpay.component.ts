import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { QRCodeComponent } from 'angularx-qrcode';
import { Service } from '../../core/services/service';
import { Router } from '@angular/router';
import { ConstantDef } from '../../core/constanDef';
import { MessageService } from 'primeng/api';
import { Subscription } from 'rxjs';
import { WebSocketService } from '../../core/services/websocket.service';
import { ConfirmDialogComponent } from '../confirmDialog/confirmDialog.component';
import { DebitComponent } from '../../features/sell/debit/debit.component';

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
  private sub?: Subscription;
  private synth: SpeechSynthesisUtterance | null = null;

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
  cartItems: any[] = [];
  orderCode: string = '';

  private timerInterval: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private wsService: WebSocketService,
    private dialogRef: MatDialogRef<PaymentQrDialogComponent>,
    private service: Service,
    private router: Router,
    private message: MessageService,
    private dialog: MatDialog
  ) {
    this.amount = data.amount;
    this.items = data.items || [];
    this.cartItems = data.cartItems;
  }

  ngOnInit() {
    this.transactionCode = this.generateTransactionCode();
    if (sessionStorage.getItem('qrCodeUrl')) {
      this.onImageLoad();
      this.qrCodeUrl = sessionStorage.getItem('qrCodeUrl') || '';
      this.orderCode = sessionStorage.getItem('orderCode') || '';
    } else {
      this.generateVietQRUrl();
    }
    this.startTimer();
    this.subscribeToPaymentSuccess();
  }

  ngOnDestroy() {
    this.clearTimer();
    this.stopSpeech();
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  private subscribeToPaymentSuccess(): void {
    this.sub = this.wsService.paymentSuccess$.subscribe((data) => {
      this.handlePaymentWithSpeech(data);

      sessionStorage.removeItem('qrCodeUrl');
      sessionStorage.removeItem('orderCode');
    });
  }

  private handlePaymentWithSpeech(data: any): void {
    const closeDialogCallback = () => {
      this.dialogRef.close({ success: true, data });
    };

    if (data?.message) {
      const speechText = this.generatePaymentMessage(data);
      this.speakMessage(speechText, 'vi-VN', closeDialogCallback);
    } else {
      closeDialogCallback();
    }
  }

  private speakMessage(text: string, lang: string = 'vi-VN', onEndCallback?: () => void): void {
    const SpeechSynthesisUtterance =
      window.SpeechSynthesisUtterance || (window as any).webkitSpeechSynthesisUtterance;
    const speechSynthesis = window.speechSynthesis || (window as any).webkitSpeechSynthesis;

    if (!SpeechSynthesisUtterance || !speechSynthesis) {
      console.warn('Trình duyệt không hỗ trợ Web Speech API');
      if (onEndCallback) onEndCallback();
      return;
    }

    this.stopSpeech();

    this.synth = new SpeechSynthesisUtterance(text);
    this.synth.lang = lang;
    this.synth.rate = 1;
    this.synth.pitch = 1;
    this.synth.volume = 1;

    this.synth.onstart = () => {
      console.log('🔊 Phát âm thanh:', text);
    };

    this.synth.onend = () => {
      console.log('✓ Kết thúc phát âm thanh');
      if (onEndCallback) onEndCallback();
    };

    this.synth.onerror = (event) => {
      console.error('❌ Lỗi phát âm thanh:', event.error);
      if (onEndCallback) onEndCallback();
    };

    speechSynthesis.speak(this.synth);
  }

  private stopSpeech(): void {
    const speechSynthesis = window.speechSynthesis || (window as any).webkitSpeechSynthesis;
    if (speechSynthesis) {
      speechSynthesis.cancel();
    }
  }

  private generatePaymentMessage(data: any): string {
    const amount = this.formatCurrencyForSpeech(data.amount);
    const baseMessage = `Thanh toán thành công ${amount} đồng`;

    if (data.orderCode) {
      const orderCode = this.formatNumberForSpeech(data.orderCode);
      return `${baseMessage}. Mã đơn hàng: ${orderCode}`;
    }

    if (data.transactionId) {
      const txnId = this.formatNumberForSpeech(data.transactionId);
      return `${baseMessage}. Mã giao dịch: ${txnId}`;
    }

    return baseMessage;
  }

  private formatCurrencyForSpeech(amount: number): string {
    if (amount >= 1000000) {
      const millions = Math.floor(amount / 1000000);
      const remainder = amount % 1000000;
      if (remainder === 0) {
        return `${millions} triệu`;
      } else {
        return `${millions} triệu ${this.formatNumberForSpeech(remainder)}`;
      }
    } else if (amount >= 1000) {
      return `${Math.floor(amount / 1000)} nghìn`;
    }
    return amount.toString();
  }

  private formatNumberForSpeech(num: string | number): string {
    const numStr = num.toString();
    const digitMap: { [key: string]: string } = {
      '0': 'không',
      '1': 'một',
      '2': 'hai',
      '3': 'ba',
      '4': 'bốn',
      '5': 'năm',
      '6': 'sáu',
      '7': 'bảy',
      '8': 'tám',
      '9': 'chín',
    };

    return numStr
      .split('')
      .map((digit) => digitMap[digit] || digit)
      .join(' ');
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

    const orderCode = Date.now();
    const params = {
      orderCode: orderCode,
      amount: this.amount,
      description: this.transactionCode,
      cancelUrl: this.router.url,
      returnUrl: this.router.url,
      items: this.cartItems,
    };

    this.service.createPayment(params).subscribe(
      (rs: any) => {
        if (rs.status === ConstantDef.STATUS_SUCCESS) {
          this.onImageLoad();
          this.qrCodeUrl = rs.response.qrCode;
          this.orderCode = rs.response.orderCode;
          sessionStorage.setItem('qrCodeUrl', this.qrCodeUrl);
          sessionStorage.setItem('orderCode', this.orderCode);
        } else {
          this.showError('Không thể tạo mã');
        }
      },
      (_error: any) => {
        this.showError('Lỗi hệ thống');
      }
    );
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
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      disableClose: true,
      data: {
        title: 'Xác nhận hủy mã',
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
      this.clearTimer();
      if (result) {
        this.service.deletePayment(this.orderCode).subscribe((rs: any) => {
          if (rs.status === ConstantDef.STATUS_SUCCESS) {
            sessionStorage.removeItem('qrCodeUrl');
            sessionStorage.removeItem('orderCode');
            this.dialogRef.close({ cancel: true, data: '' });
          }
        });
      }
    });
  }

  updateBankInfo(bankInfo: Partial<BankInfo>) {
    this.bankInfo = { ...this.bankInfo, ...bankInfo };
    this.generateVietQRUrl();
  }

  debit() {
    this.dialogRef.close();
    if (this.cartItems.length === 0) {
      this.showError('Giỏ hàng trống, vui lòng thêm sản phẩm trước');
      return;
    }

    const dialogRef = this.dialog.open(DebitComponent, {
      disableClose: true,
      data: {
        totalAmount: this.amount,
        qrCodeUrl: this.qrCodeUrl,
      },
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        console.log('Thông tin ghi nợ:', result);
        this.showSuccess(
          `Đã ghi nợ ${this.formatCurrency(result.debitAmount)} cho khách hàng ${
            result.customerName
          }`
        );

        this.cartItems = [];
      }
    });
  }
}
