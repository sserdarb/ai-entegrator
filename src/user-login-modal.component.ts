import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-user-login-modal',
  
  imports: [FormsModule],
  templateUrl: './user-login-modal.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserLoginModalComponent {
  private authService = inject(AuthService);
  
  close = output<void>();

  username = '';
  password = '';
  errorMessage = signal('');

  handleLogin() {
    this.errorMessage.set('');
    const user = this.authService.login(this.username, this.password);
    if (user) {
      this.close.emit();
    } else {
      this.errorMessage.set('Kullanıcı adı veya şifre hatalı. (İpucu: demo/password)');
    }
  }
}