import { AfterViewChecked, Directive, ElementRef, inject } from '@angular/core';

@Directive({
  selector: '[appAutoScroll]',
  standalone: true,
})
export class AutoScrollDirective implements AfterViewChecked {
  // Automatically scrolls to the bottom of the element .
  private readonly el = inject(ElementRef);

  // After the view has been checked, scroll to the bottom of the element.
  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  // 
  private scrollToBottom(): void {
    // Try to set the scrollTop property to the scrollHeight of the element to scroll to the bottom.
    const nativeElement = this.el.nativeElement;
    try {
      nativeElement.scrollTop = nativeElement.scrollHeight;
    } catch (err) {
      console.error('Error al intentar forzar auto-scroll: ', err);
    }
  }
}
