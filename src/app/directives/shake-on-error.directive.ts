import { Directive, ElementRef, Input, OnChanges } from '@angular/core';

@Directive({
  selector: '[appShakeOnError]',
  standalone: true
})
export class ShakeOnErrorDirective implements OnChanges {
  @Input() appShakeOnError: boolean | undefined = false;

  constructor(private el: ElementRef) {}

  ngOnChanges() {
    if (this.appShakeOnError) {
      this.el.nativeElement.classList.add('shake-animation');
      setTimeout(() => {
        this.el.nativeElement.classList.remove('shake-animation');
      }, 500);
    }
  }
}