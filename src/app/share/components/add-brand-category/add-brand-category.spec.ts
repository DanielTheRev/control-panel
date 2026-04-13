import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddBrandCategory } from './add-brand-category';

describe('AddBrandCategory', () => {
  let component: AddBrandCategory;
  let fixture: ComponentFixture<AddBrandCategory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddBrandCategory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddBrandCategory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
