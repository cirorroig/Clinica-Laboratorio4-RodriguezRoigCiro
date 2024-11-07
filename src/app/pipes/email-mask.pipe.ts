import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'emailMask',
  standalone: true
})
export class EmailMaskPipe implements PipeTransform {
  transform(email: string): string {
    if (!email) return '';
    
    const [username, domain] = email.split('@');
    const maskedUsername = username.charAt(0) + 
      '*'.repeat(username.length - 2) + 
      username.charAt(username.length - 1);
    
    return `${maskedUsername}@${domain}`;
  }
}