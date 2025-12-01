import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Service } from '../../../core/services/service';
import { ConstantDef } from '../../../core/constanDef';
import { TokenService } from '../../../core/services/token.service';

interface RegisterFormData {
  phone_number: string;
  password: string;
  confirm_password: string;
  first_name: string;
  last_name: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ToastModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  providers: [MessageService],
})
export class LoginComponent implements OnInit {
  phoneNumber: string = '';
  password: string = '';
  registerData: RegisterFormData = {
    phone_number: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
  };
  activeTab: 'login' | 'register' = 'login';
  isLoading: boolean = false;

  private readonly MIN_PHONE_LENGTH = 10;
  private readonly MIN_PASSWORD_LENGTH = 6;

  constructor(
    private readonly service: Service,
    private readonly router: Router,
    private readonly tokenService: TokenService,
    private readonly messageService: MessageService
  ) {}

  ngOnInit(): void {}

  switchTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
    this.resetForms();
  }

  resetForms(): void {
    this.phoneNumber = '';
    this.password = '';
    this.registerData = {
      phone_number: '',
      password: '',
      confirm_password: '',
      first_name: '',
      last_name: '',
    };
  }

  validateNumericInput(event: KeyboardEvent): void {
    const invalidKeys = ['e', 'E', '+', '-', '.'];
    if (invalidKeys.includes(event.key)) {
      event.preventDefault();
    }
  }

  login(): void {
    if (!this.validateLoginForm() || this.isLoading) {
      return;
    }

    this.isLoading = true;
    const credentials = {
      phone_number: this.phoneNumber.trim(),
      password: this.password.trim(),
    };

    this.service.login(credentials).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.status === ConstantDef.STATUS_SUCCESS) {
          this.tokenService.setAccessToken(response.response.access);
          this.showSuccessMessage('Đăng nhập thành công đang tải dữ liệu');
          setTimeout(() => {
            this.router.navigate(['page/home']);
          }, 1000);
        } else {
          this.showErrorMessage(
            response.response?.error_message_vn || 'Đăng nhập thất bại'
          );
        }
      },
      error: () => {
        this.isLoading = false;
        this.showErrorMessage('Đã có lỗi xảy ra, vui lòng thử lại sau');
      },
    });
  }

  register(): void {
    if (!this.validateRegisterForm() || this.isLoading) {
      return;
    }

    this.isLoading = true;
    const userData = {
      phone_number: this.registerData.phone_number.trim(),
      password: this.registerData.password.trim(),
      first_name: this.registerData.first_name.trim(),
      last_name: this.registerData.last_name.trim(),
    };

    this.service.register(userData).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        if (response.status === ConstantDef.STATUS_SUCCESS) {
          this.showSuccessMessage('Đăng ký thành công! Vui lòng đăng nhập');
          setTimeout(() => {
            this.activeTab = 'login';
            this.phoneNumber = this.registerData.phone_number;
            this.resetForms();
          }, 1000);
        } else {
          this.showErrorMessage(
            response.response?.error_message_vn || 'Đăng ký thất bại'
          );
        }
      },
      error: () => {
        this.isLoading = false;
        this.showErrorMessage('Đã có lỗi xảy ra, vui lòng thử lại sau');
      },
    });
  }

  private validateLoginForm(): boolean {
    if (!this.phoneNumber?.trim()) {
      this.showWarningMessage('Vui lòng nhập số điện thoại');
      return false;
    }

    if (this.phoneNumber.trim().length < this.MIN_PHONE_LENGTH) {
      this.showWarningMessage(`Số điện thoại phải có ít nhất ${this.MIN_PHONE_LENGTH} số`);
      return false;
    }

    if (!this.password?.trim()) {
      this.showWarningMessage('Vui lòng nhập mật khẩu đăng nhập');
      return false;
    }

    return true;
  }

  private validateRegisterForm(): boolean {
    if (!this.registerData.phone_number?.trim()) {
      this.showWarningMessage('Vui lòng nhập số điện thoại');
      return false;
    }

    if (this.registerData.phone_number.trim().length < this.MIN_PHONE_LENGTH) {
      this.showWarningMessage(`Số điện thoại phải có ít nhất ${this.MIN_PHONE_LENGTH} số`);
      return false;
    }

    if (!this.registerData.password?.trim()) {
      this.showWarningMessage('Vui lòng nhập mật khẩu');
      return false;
    }

    if (this.registerData.password.length < this.MIN_PASSWORD_LENGTH) {
      this.showWarningMessage(`Mật khẩu phải có ít nhất ${this.MIN_PASSWORD_LENGTH} ký tự`);
      return false;
    }

    if (this.registerData.password !== this.registerData.confirm_password) {
      this.showWarningMessage('Mật khẩu xác nhận không khớp');
      return false;
    }

    if (!this.registerData.first_name?.trim()) {
      this.showWarningMessage('Vui lòng nhập họ');
      return false;
    }

    if (!this.registerData.last_name?.trim()) {
      this.showWarningMessage('Vui lòng nhập tên');
      return false;
    }

    return true;
  }

  private showSuccessMessage(message: string): void {
    this.messageService.add({
      severity: 'success',
      summary: 'Thành công',
      detail: message,
      life: 1500,
    });
  }

  private showErrorMessage(message: string): void {
    this.messageService.add({
      severity: 'error',
      summary: 'Thông báo',
      detail: message,
      life: 2000,
    });
  }

  private showWarningMessage(message: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Thông báo',
      detail: message,
      life: 1500,
    });
  }
}
