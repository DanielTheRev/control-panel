import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddEditProduct } from './add-edit-product';

describe('AddEditProduct', () => {
  let component: AddEditProduct;
  let fixture: ComponentFixture<AddEditProduct>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddEditProduct]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddEditProduct);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
