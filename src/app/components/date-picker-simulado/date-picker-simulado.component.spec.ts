import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatePickerSimuladoComponent } from './date-picker-simulado.component';

describe('DatePickerSimuladoComponent', () => {
  let component: DatePickerSimuladoComponent;
  let fixture: ComponentFixture<DatePickerSimuladoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatePickerSimuladoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DatePickerSimuladoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
