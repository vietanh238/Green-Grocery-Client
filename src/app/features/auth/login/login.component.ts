import { Component, OnInit } from '@angular/core';
import { Service } from '../../../core/services/service';
import { FormsModule } from '@angular/forms';
import { ConstantDef } from '../../../core/constanDef';
import { Router } from '@angular/router';
import { TokenService } from '../../../core/services/token.service';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ToastModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  providers: [MessageService],
})
export class LoginComponent implements OnInit {
  // Login data
  phoneNum: string = '';
  password: string = '';

  // Register data
  registerData = {
    phone_number: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
  };

  // UI states
  activeTab: 'login' | 'register' = 'login';
  isLoading: boolean = false;

  constructor(
    private service: Service,
    private router: Router,
    private token: TokenService,
    private message: MessageService
  ) {}

  ngOnInit(): void {}

  switchTab(tab: 'login' | 'register'): void {
    this.activeTab = tab;
    this.resetForms();
  }

  resetForms(): void {
    // Reset login form
    this.phoneNum = '';
    this.password = '';

    // Reset register form
    this.registerData = {
      phone_number: '',
      password: '',
      confirm_password: '',
      first_name: '',
      last_name: '',
    };
  }

  validateInput(event: KeyboardEvent): void {
    if (event.key === 'e' || event.key === 'E' || event.key === '+' || event.key === '-') {
      event.preventDefault();
    }
  }

  login(): void {
    if (!this.validateLogin()) return;
    if (this.isLoading) return;

    this.isLoading = true;

    const params = {
      phone_number: this.phoneNum.trim(),
      password: this.password.trim(),
    };

    this.service.login(params).subscribe(
      (data: any) => {
        this.isLoading = false;

        if (data.status === ConstantDef.STATUS_SUCCESS) {
          this.saveAccessToken(data.response.access);
          this.message.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đăng nhập thành công',
            life: 1500,
          });

          setTimeout(() => {
            this.router.navigate(['page/home']);
          }, 500);
        } else {
          this.message.add({
            severity: 'error',
            summary: 'Thông báo',
            detail: data.response.error_message_vn,
            life: 2000,
          });
        }
      },
      (error: any) => {
        this.isLoading = false;
        this.message.add({
          severity: 'error',
          summary: 'Thông báo',
          detail: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
          life: 2000,
        });
      }
    );
  }

  register(): void {
    if (!this.validateRegister()) return;
    if (this.isLoading) return;

    this.isLoading = true;

    const params = {
      phone_number: this.registerData.phone_number.trim(),
      password: this.registerData.password.trim(),
      first_name: this.registerData.first_name.trim(),
      last_name: this.registerData.last_name.trim(),
    };

    this.service.register(params).subscribe(
      (data: any) => {
        this.isLoading = false;

        if (data.status === ConstantDef.STATUS_SUCCESS) {
          this.message.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đăng ký thành công! Vui lòng đăng nhập',
            life: 2000,
          });

          setTimeout(() => {
            this.activeTab = 'login';
            this.phoneNum = this.registerData.phone_number;
            this.resetForms();
          }, 1000);
        } else {
          this.message.add({
            severity: 'error',
            summary: 'Thông báo',
            detail: data.response.error_message_vn,
            life: 2000,
          });
        }
      },
      (error: any) => {
        this.isLoading = false;
        this.message.add({
          severity: 'error',
          summary: 'Thông báo',
          detail: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
          life: 2000,
        });
      }
    );
  }

  saveAccessToken(token: string): void {
    this.token.setAccessToken(token);
  }

  validateLogin(): boolean {
    if (!this.phoneNum || this.phoneNum.trim() === '') {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Vui lòng nhập số điện thoại',
        life: 1500,
      });
      return false;
    }

    if (this.phoneNum.trim().length < 10) {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Số điện thoại phải có ít nhất 10 số',
        life: 1500,
      });
      return false;
    }

    if (!this.password || this.password.trim() === '') {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Vui lòng nhập mật khẩu đăng nhập',
        life: 1500,
      });
      return false;
    }

    return true;
  }

  validateRegister(): boolean {
    // Validate phone number
    if (!this.registerData.phone_number || this.registerData.phone_number.trim() === '') {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Vui lòng nhập số điện thoại',
        life: 1500,
      });
      return false;
    }

    if (this.registerData.phone_number.trim().length < 10) {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Số điện thoại phải có ít nhất 10 số',
        life: 1500,
      });
      return false;
    }

    // Validate password
    if (!this.registerData.password || this.registerData.password.trim() === '') {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Vui lòng nhập mật khẩu',
        life: 1500,
      });
      return false;
    }

    if (this.registerData.password.length < 6) {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Mật khẩu phải có ít nhất 6 ký tự',
        life: 1500,
      });
      return false;
    }

    // Validate confirm password
    if (this.registerData.password !== this.registerData.confirm_password) {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Mật khẩu xác nhận không khớp',
        life: 1500,
      });
      return false;
    }

    // Validate first name
    if (!this.registerData.first_name || this.registerData.first_name.trim() === '') {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Vui lòng nhập họ',
        life: 1500,
      });
      return false;
    }

    // Validate last name
    if (!this.registerData.last_name || this.registerData.last_name.trim() === '') {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Vui lòng nhập tên',
        life: 1500,
      });
      return false;
    }

    return true;
  }
}
