import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteConfirm } from './delete-confirm';

describe('DeleteConfirm', () => {
  let component: DeleteConfirm;
  let fixture: ComponentFixture<DeleteConfirm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteConfirm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteConfirm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
