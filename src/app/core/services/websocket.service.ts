import { Injectable, NgZone } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws?: WebSocket;
  private reconnectDelay = 3000;

  private paymentSuccessSource = new Subject<any>();
  private messageSource = new Subject<any>();
  private connectionStatus = new BehaviorSubject<boolean>(false);

  paymentSuccess$ = this.paymentSuccessSource.asObservable();
  message$ = this.messageSource.asObservable();
  connected$ = this.connectionStatus.asObservable();

  constructor(private ngZone: NgZone) {}

  connect(): void {
    const url = 'wss://api.green-grocery.io.vn/ws/message/';
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connectionStatus.next(true);
      this.send({ type: 'ping', at: Date.now() });
    };

    this.ws.onmessage = (event) => {
      this.ngZone.run(() => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type == 'echo') {
            console.log(`${msg.data.type} connect websocket success`);
          }
          if (msg.type === 'payment_success') {
            this.paymentSuccessSource.next(msg.data);
          } else if (msg.type === 'message') {
            this.messageSource.next(msg.data);
          }
        } catch (e) {
          console.warn('WS message is not valid JSON:', event.data);
        }
      });
    };

    this.ws.onclose = () => {
      this.connectionStatus.next(false);
      setTimeout(() => this.connect(), this.reconnectDelay);
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
    this.connectionStatus.next(false);
  }
}
