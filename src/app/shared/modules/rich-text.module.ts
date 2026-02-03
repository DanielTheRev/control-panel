import { NgModule } from '@angular/core';
import { QuillModule } from 'ngx-quill';

@NgModule({
  imports: [QuillModule],
  exports: [QuillModule]
})
export class RichTextModule { }
