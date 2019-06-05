import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { AssetsSearchBarComponent } from './assets-search-bar.component';

describe('AssetsSearchBarComponent', () => {
  let component: AssetsSearchBarComponent;
  let fixture: ComponentFixture<AssetsSearchBarComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ AssetsSearchBarComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AssetsSearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
