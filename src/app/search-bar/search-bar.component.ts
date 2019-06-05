import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, AfterViewInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { NEVER, Observable, of, Subject } from 'rxjs';
import { debounce, delay, distinctUntilChanged, map, startWith, switchMap, tap } from 'rxjs/operators';

import { MatAutocomplete, MatAutocompleteSelectedEvent, MatAutocompleteTrigger, MatChipInputEvent, MatChipList } from '@angular/material';
import { COMMA, ENTER, LEFT_ARROW } from '@angular/cdk/keycodes';

function nestedCopy(array) {
  return JSON.parse(JSON.stringify(array));
}

export interface SearchValue {
  type?: string;
  value: string;
}
export interface SearchItem {
  title: string;
  id?: string;
  type?: string;
  image?: string;
  groupType?: string;
  [key: string]: any;
}

export interface Chip {
  type: string;
  value: SearchItem;
}
export interface StateGroup {
  groupTitle: string;
  groupType?: string;
  groupItems: SearchItem[];
}

export interface SearchValue {
  type?: string;
  value: string;
}

export interface SearchToken {
  type: 'GENERAL' | 'SPECIFIC' | 'FREE';
  value: SearchValue;
}

@Component({
  // tslint:disable-next-line:component-selector
  selector: 'rev-search-bar',
  templateUrl: `./search-bar.component.html`,
  styleUrls: ['./search-bar.component.css']
})
export class SearchBarComponent implements OnInit, AfterViewInit {
  @Output() debug = new EventEmitter();
  @Output() updateSearchToken = new EventEmitter<SearchToken>();
  @Output() updateChips = new EventEmitter();
  @Output() clearChips = new EventEmitter();

  @Input() placeholder = 'Search...';
  @Input() multiple = true;
  @Input() selectable = true;
  @Input() removable = true;
  @Input() addOnBlur = true;
  @Input() showSearchTerms = false;
  @Input() showTypeInfo = false;
  @Input() showGroups = false;
  @Input() allowDuplicates = false;
  @Input() debounceTime = 400;
  @Input() searchTerms = [];
  @Input() freeTextSearchType = '';
  @Input() searchTermsHelp = 'Search help...';
  @Input() noDataText = 'No Data';
  @Input() showDebug = false;

  @ViewChild('searchInput', { static: false }) searchInput: ElementRef<HTMLInputElement>;
  @ViewChild('searchInput', { read: MatAutocompleteTrigger, static: false }) trigger: MatAutocompleteTrigger;
  @ViewChild('chipList', { read: MatChipList, static: false }) chipList: MatChipList;
  @ViewChild('auto', { static: false }) matAutocomplete: MatAutocomplete;

  chips: Chip[] = [];

  separatorKeysCodes: number[] = [ENTER, COMMA];
  searchCtrl = new FormControl();
  searchTermsStatic = [];
  stateGroupOptionsStatic: StateGroup[] = [];
  hasData = false;
  showNoData = false;
  isSpecific = false;
  isUpdating = false;

  private localStateGroupOptionsStatic: StateGroup[] = [];

  private searchStream = new Subject();
  private search$ = this.searchStream.asObservable();

  constructor(
    private changeRef: ChangeDetectorRef
  ) {
  }

  public setItems(items: StateGroup[] | any[]) {
    return of(true)
      .pipe(
        map(() => nestedCopy(items)),
        tap(() => this.localStateGroupOptionsStatic = items),
        map((itemsToFilter: StateGroup[]): StateGroup[] => {
          if (this.chips.length === 0) {
            this.stateGroupOptionsStatic = itemsToFilter;
          } else {
            this.stateGroupOptionsStatic = this.filterAutosuggestionByChips(this.localStateGroupOptionsStatic);
          }

          this.stateGroupOptionsStatic = this.stateGroupOptionsStatic.filter((group: StateGroup) => group.groupItems.length > 0);
          return this.stateGroupOptionsStatic;
        })
      );
  }

  toSearchItem(searchValue: SearchValue): SearchItem {
    return {
      id: null,
      title: searchValue.value,
      type: searchValue.type
    };
  }

  addChip(chip: Chip): void {
    this.chips.push(chip);
    this.updateChips.emit({ type: 'ADD', chip });
    this.releaseInputs();
    if (this.trigger.panelOpen) {
      this.trigger.closePanel();
      this.setItems([]).subscribe().unsubscribe();
      this.updateUiState([]);
    }
  }

  ngAfterViewInit(): void {
  }

  ngOnInit(): void {
    this.debug.emit(this);
    this.searchCtrl.valueChanges.pipe(
      startWith(null),
      switchMap((item: string | SearchItem | null) => {
        if (!item) {
          return NEVER;
        }

        const token = this.getSearchToken();

        if (!token) {
          return NEVER;
        }

        return of(token);
      })
    ).subscribe((item: SearchToken) => {
      this.searchTermsStatic = this.searchTerms.slice();
      this.isSpecific = item.type === 'SPECIFIC';
    });

    this.search$.pipe(
      switchMap((event) => {
        const token = this.getSearchToken();
        // console.log('search by token', token);

        if (!token) {
          return NEVER;
        }

        return of(event);
      }),
      debounce(val => of(true).pipe(delay(this.debounceTime))),
      distinctUntilChanged()
    )
      .subscribe(($event: KeyboardEvent | ClipboardEvent) => {
        if ($event.type === 'paste') {
          // tslint:disable-next-line:no-string-literal
          const clipboardData = ($event as ClipboardEvent).clipboardData || window['clipboardData'];
          this.updateSearchToken.emit(this.getSearchToken(clipboardData.getData('text')));
        } else {
          const token = this.getSearchToken();
          if (($event as KeyboardEvent).keyCode === ENTER) {
            return;
          }
          this.updateSearchToken.emit(token);
        }
      });
  }

  add(event: MatChipInputEvent): void {
    const input = event.input;
    // Add chip only when MatAutocomplete is not open
    // To make sure this does not conflict with OptionSelected Event
    let token = this.getSearchToken();

    if ((!this.matAutocomplete.isOpen) || (!this.hasData)) {
      const freeText = event.value;
      token = this.getSearchToken(freeText);
      if (freeText && this.freeTextSearchType) {
        if (!this.allowDuplicates) {
          const inChips = this.chips
            .filter(chip => chip.type === this.freeTextSearchType)
            .findIndex(chip => chip.value.title === freeText) !== -1;
          if (inChips) {
            return;
          }
        }
        if (token.type === 'SPECIFIC' && token.value.value !== '') {
          // this.addChip({ type: token.value.type, value: this.toSearchItem(token.value) });
        } else {
          this.addChip({
            type: this.freeTextSearchType,
            value: {
              id: null,
              title: freeText,
              groupType: this.freeTextSearchType
            }
          });

          this.updateSearchToken.emit({
            type: 'FREE',
            value: {
              type: this.freeTextSearchType,
              value: freeText
            }
          });
        }
      }
    }

    this.releaseInputs();
  }

  remove(chip: Chip): void {
    const index = this.chips.indexOf(chip);

    if (index >= 0) {
      this.chips.splice(index, 1);
    }

    this.updateChips.emit({ type: 'REMOVE' });
    this.stateGroupOptionsStatic = this.filterAutosuggestionByChips(this.localStateGroupOptionsStatic);
    if (this.chips.length === 0) {
      this.clearChips.emit();
    }
  }

  selected(event: MatAutocompleteSelectedEvent): void {
    if (event) {
      this.addChip({ type: event.option.value.groupType, value: event.option.value });
      this.stateGroupOptionsStatic = this.filterAutosuggestionByChips(this.localStateGroupOptionsStatic);
    }
  }

  onType($event: KeyboardEvent | ClipboardEvent) {
    if (($event as KeyboardEvent).keyCode === LEFT_ARROW && this.chips.length > 0) {
      // select the last chip for enabling arrow navigation
      this.searchInput.nativeElement.blur();
      this.chipList.focus();
      this.chipList.chips.last.focus();
      this.searchInput.nativeElement.click();
    } else {
      this.searchStream.next($event);
    }
  }

  executeSearchQuery(searchStream: Observable<any>): any {
    return of(true)
      .pipe(
        tap(() => this.isUpdating = true),
        switchMap(() => searchStream),
        switchMap((items) => {
          // console.log('executeSearchQuery result', items);
          return this.setItems(items);
        }),
        tap((items) => {
          this.updateUiState(items);
        })
      );
  }

  getChips(): Chip[] {
    return this.chips;
  }

  private filterAutosuggestionByChips(itemsToFilter: StateGroup[]) {
    if (this.allowDuplicates) {
      return nestedCopy(itemsToFilter);
    }

    return nestedCopy(itemsToFilter).map((group) => {
      const groupType = group.groupType;
      const chips = this.chips.filter((chip: Chip) => chip.type === groupType);

      if (chips.length === 0) {
        return group;
      }

      group.groupItems = group.groupItems.filter((item: SearchItem) => {
        const inChip = chips.findIndex((chip) => chip.value.id === item.id);
        return !(inChip !== -1);
      });
      return group;
    });
  }

  private getSearchToken(text = null): SearchToken {
    const DELIMITER = ':';
    const searchText = text || this.searchInput.nativeElement.value;
    if (!searchText) {
      return null;
    }

    if (!this.showSearchTerms) {
      return {
        type: 'GENERAL',
        value: { value: searchText }
      };
    }

    if (searchText.includes(':')) {
      const searchCriteria = searchText.split(DELIMITER);
      if (searchCriteria.length > 2) {
        return { type: 'GENERAL', value: { value: searchText } };
      } else {
        const [type, value] = searchCriteria;
        if (this.searchTerms.findIndex((term: string) => term.toLowerCase() === type.toLowerCase()) !== -1) {
          return { type: 'SPECIFIC', value: { type: type.toLowerCase(), value } };
        } else {
          return { type: 'GENERAL', value: { value: searchText } };
        }
      }

    } else {
      return {
        type: 'GENERAL',
        value: { value: this.searchInput.nativeElement.value }
      };
    }
  }

  private releaseInputs() {
    this.searchInput.nativeElement.value = '';
    this.searchCtrl.setValue(null);
  }

  private updateUiState(items: any) {
    const total = items.reduce((count, group) => {
      return count + group.groupItems.length;
    }, 0);

    this.isUpdating = false;
    this.hasData = total > 0;
    this.showNoData = !this.isUpdating && total === 0 && this.searchInput.nativeElement.value !== '';
  }
}
