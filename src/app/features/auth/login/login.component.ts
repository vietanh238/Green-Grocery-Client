import { Component, OnInit } from '@angular/core';
import { Service } from '../../../core/services/service';
import { FormsModule } from '@angular/forms';
import { ConstantDef } from '../../../core/constanDef';
import { Router } from '@angular/router';
import $ from 'jquery';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  phoneNum: string = '';
  password: string = '';

  constructor(private service: Service, private router: Router) {}

  ngOnInit(): void {}

  validateInput(event: KeyboardEvent) {
    if (event.key === 'e') {
      event.preventDefault();
    }
  }

  login() {
    const phoneNumber = this.phoneNum;
    const password = this.password.trim();
    const params = {
      phone_number: $('#phoneNum').val(),
      password: password,
    };
    this.service.login(params).subscribe((data: any) => {
      if (data.status === ConstantDef.STATUS_SUCCESS) {
        this.router.navigate(['home']);
      }
    });
  }
}
