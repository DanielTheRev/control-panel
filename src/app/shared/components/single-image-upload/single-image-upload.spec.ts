import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SingleImageUpload } from './single-image-upload';

describe('SingleImageUpload', () => {
  let component: SingleImageUpload;
  let fixture: ComponentFixture<SingleImageUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SingleImageUpload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SingleImageUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
