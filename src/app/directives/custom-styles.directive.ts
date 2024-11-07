import { Directive, ElementRef, Input, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appCustomStyles]',
  standalone: true,
})
export class CustomStylesDirective {
  @Input() appCustomStyles: { [key: string]: string } = {};

  constructor(private elementRef: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.applyStyles();
  }

  applyStyles() {
    for (const [key, value] of Object.entries(this.appCustomStyles)) {
      this.renderer.setStyle(this.elementRef.nativeElement, key, value);
    }
  }
}