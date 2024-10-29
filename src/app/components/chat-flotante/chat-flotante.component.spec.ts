import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatFlotanteComponent } from './chat-flotante.component';

describe('ChatFlotanteComponent', () => {
  let component: ChatFlotanteComponent;
  let fixture: ComponentFixture<ChatFlotanteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatFlotanteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatFlotanteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
