import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProviderCreate } from './provider-create';

describe('ProviderCreate', () => {
  let component: ProviderCreate;
  let fixture: ComponentFixture<ProviderCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProviderCreate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProviderCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
