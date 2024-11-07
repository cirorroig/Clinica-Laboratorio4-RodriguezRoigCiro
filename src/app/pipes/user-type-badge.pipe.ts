import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'userTypeBadge',
  standalone: true
})
export class UserTypeBadgePipe implements PipeTransform {
  transform(type: string): string {
    const badges: {[key: string]: string} = {
      'Paciente': 'bg-success',
      'Especialista': 'bg-primary',
      'Admin': 'bg-danger'
    };

    const baseType = Object.keys(badges).find(key => type.includes(key)) || 'Paciente';
    return badges[baseType];
  }
}
