import { Component, OnInit } from '@angular/core';
import { Service } from '../../../core/services/service';
import { FormsModule } from '@angular/forms';
import { ConstantDef } from '../../../core/constanDef';
import { Router } from '@angular/router';
import { TokenService } from '../../../core/services/token.service';
import $, { error } from 'jquery';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, ToastModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  phoneNum: string = '';
  password: string = '';
  isLoading: boolean = false;

  constructor(
    private service: Service,
    private router: Router,
    private token: TokenService,
    private message: MessageService
  ) {}

  ngOnInit(): void {}

  validateInput(event: KeyboardEvent) {
    if (event.key === 'e') {
      event.preventDefault();
    }
  }

  login() {
    if (!this.validate()) return;
    if (this.isLoading) return;

    this.isLoading = true;
    setTimeout(() => {
      this.isLoading = false;
    }, 2000);
    const password = this.password.trim();
    const params = {
      phone_number: $('#phoneNum').val(),
      password: password,
    };
    this.service.login(params).subscribe(
      (data: any) => {
        if (data.status === ConstantDef.STATUS_SUCCESS) {
          this.saveAccessToken(data.response.access);
          this.router.navigate(['page/home']);
        } else {
          this.message.add({
            severity: 'error',
            summary: 'Thông báo',
            detail: data.response.error_message_vn,
            life: 1000,
          });
        }
      },
      (error: any) => {
        this.message.add({
          severity: 'error',
          summary: 'Thông báo',
          detail: 'Đã có lỗi xảy ra, vui lòng thử lại sau',
          life: 1000,
        });
        this.isLoading = false;
      }
    );
  }

  saveAccessToken(token: string) {
    this.token.setAccessToken(token);
  }

  validate(): boolean {
    if (!this.phoneNum) {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Vui lòng nhập số điện thoại',
        life: 1000,
      });
      return false;
    }
    if (!this.password) {
      this.message.add({
        severity: 'warn',
        summary: 'Thông báo',
        detail: 'Vui lòng nhập mât khẩu đăng nhập',
        life: 1000,
      });
      return false;
    }
    return true;
  }
}
