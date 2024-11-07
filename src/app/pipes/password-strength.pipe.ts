import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'passwordStrength',
  standalone: true
})
export class PasswordStrengthPipe implements PipeTransform {
  transform(password: string): string {
    if (!password) return 'Sin contraseña';
    
    const strength = this.calculateStrength(password);
    
    if (strength < 30) return 'Débil';
    if (strength < 60) return 'Media';
    return 'Fuerte';
  }

  private calculateStrength(password: string): number {
    let strength = 0;
    if (password.length >= 8) strength += 20;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[a-z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 20;
    return strength;
  }
}
