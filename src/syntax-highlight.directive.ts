import { Directive, ElementRef, effect, inject, input } from '@angular/core';

declare var hljs: any; // Declare highlight.js to avoid TypeScript errors

@Directive({
  selector: 'code[appSyntaxHighlight]',
  
})
export class SyntaxHighlightDirective {
  private elementRef = inject(ElementRef<HTMLElement>);
  
  code = input.required<string>({ alias: 'appSyntaxHighlight' });
  language = input<string>('plaintext', { alias: 'lang' });

  constructor() {
    effect(() => {
      this.highlight();
    });
  }

  private highlight(): void {
      const element = this.elementRef.nativeElement;
      const codeContent = this.code();
      const lang = this.language();
      
      element.textContent = codeContent;
      
      if (typeof hljs !== 'undefined' && codeContent) {
        element.className = `language-${lang}`;
        hljs.highlightElement(element);
      } else {
        element.className = '';
      }
  }
}