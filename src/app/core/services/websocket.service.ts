// src/app/services/payment-ws.service.ts
import { Injectable, NgZone } from '@angular/core';
import { environment, URL_SERVER } from '../../../environment/environment';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws?: WebSocket;
  constructor(private ngZone: NgZone) {}
  private paymentSuccessSource = new Subject<any>();
  paymentSuccess$ = this.paymentSuccessSource.asObservable();

  connect(): void {
    const url = 'wss://uncondemnable-faviola-nondeducible.ngrok-free.dev/ws/message/';
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.send({ type: 'ping', at: Date.now() });
    };

    this.ws.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'payment_success') {
            this.paymentSuccessSource.next(msg.data);
          } else {
            console.log('[WS] Message:', msg);
          }
        } catch {
          console.warn('WS message is not valid JSON:', event.data);
        }
      });
    };

    this.ws.onclose = (ev) => {
      setTimeout(() => this.connect(), 3000);
    };

    this.ws.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = undefined;
  }
}
