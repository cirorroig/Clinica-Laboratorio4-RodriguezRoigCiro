import { Directive, ElementRef, HostListener } from '@angular/core';

@Directive({
  selector: '[appPasswordToggle]',
  standalone: true
})
export class PasswordToggleDirective {
  private shown = false;

  constructor(private el: ElementRef) {
    this.setupToggleButton();
  }

  private setupToggleButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-secondary position-absolute end-0 top-50 translate-middle-y';
    button.style.zIndex = '5';
    button.innerHTML = '<i class="bi bi-eye"></i>';
    
    this.el.nativeElement.parentElement.style.position = 'relative';
    this.el.nativeElement.parentElement.appendChild(button);

    button.addEventListener('click', () => {
      this.shown = !this.shown;
      this.el.nativeElement.type = this.shown ? 'text' : 'password';
      button.innerHTML = this.shown ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    });
  }
}