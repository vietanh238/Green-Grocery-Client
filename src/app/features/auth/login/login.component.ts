import { Component, OnInit } from '@angular/core';
import { Service } from '../../../core/services/service';
import { FormsModule } from '@angular/forms';
import { ConstantDef } from '../../../core/constanDef';
import { Router } from '@angular/router';
import { TokenService } from '../../../core/services/token.service';
import $ from 'jquery';
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
    const password = this.password.trim();
    const params = {
      phone_number: $('#phoneNum').val(),
      password: password,
    };
    this.service.login(params).subscribe((data: any) => {
      if (data.status === ConstantDef.STATUS_SUCCESS) {
        this.saveAccessToken(data.response.access);
        this.router.navigate(['home']);
      } else {
        this.message.add({
          severity: 'info',
          summary: 'Thông báo',
          detail: data.response.error_message,
          life: 300000,
        });
      }
    });
  }

  saveAccessToken(token: string) {
    this.token.setAccessToken(token);
  }
}
