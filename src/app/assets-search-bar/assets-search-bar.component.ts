import {Component, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {Apollo} from 'apollo-angular';
import gql from 'graphql-tag';
import {catchError, filter, map, switchMap} from 'rxjs/operators';
import {Chip, SearchBarComponent, SearchToken, StateGroup} from '../search-bar/search-bar.component';
import {NEVER, of, Subject, Subscription} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import * as _ from 'lodash';

export class QueryFinder {
  query: string;
  groupType: string;
  getStateGroup: (response: any) => StateGroup;
}

@Component({
  selector: 'app-assets-search-bar',
  templateUrl: './assets-search-bar.component.html',
  styleUrls: ['./assets-search-bar.component.css']
})
export class AssetsSearchBarComponent implements OnInit {
  @ViewChild('searchBar', { static: false }) public searchBar: SearchBarComponent;

  @Output() debug = new EventEmitter();

  @Input() placeholder = 'Search...';
  @Input() selectable = true;
  @Input() removable = true;
  @Input() addOnBlur = true;
  @Input() useGroup = false;
  @Input() showSearchTerms = true;
  @Input() allowDuplicates = false;
  @Input() allowMultipleSearchTypes = false;
  @Input() debounceTime = 400;
  @Input() queryLimit = 20;
  @Input() searchTermsHelp: string;
  @Input() assetsOrder: string;
  @Input() freeTextSearchType = 'title';
  @Input() noDataText = 'No Data';
  @Input() showGroups = false;
  @Input() showDebug = false;
  @Input() showTypeInfo = false;

  get searchQueries(): any {
    return this.searchQueriesAllowed;
  }

  @Input('searchQueries')
  set searchQueries(value: any) {
    this.searchQueriesAllowed = value;
  }

  private searchQueriesAllowed = [];

  private searchSubscription: Subscription = null;

  private mainSubject = new Subject();
  private main$ = this.mainSubject.asObservable();

  private queryFinders: QueryFinder[] = [];

  constructor(
    private http: HttpClient,
    private apollo: Apollo
  ) {
    this.queryFinders.push(
      {
        groupType: 'asset',
        query: `
        assets: Assets(title: $token, limit: $limit, order: "title_desc") {
            page_info {
              total
            }
            results {
              id: pk
              title
              upc
              image: item {
                url
              }
            }
        }
        `,
        getStateGroup: (response: any): StateGroup => {
          return {
            groupTitle: 'Assets',
            groupType: 'asset',
            groupItems: _.map(
              _.get(response, 'assets.results', []),
              (asset) => {
                return _.assign(
                  {},
                  asset,
                  {
                    image: (asset.image.url || './assets/images/covers/vynil.svg'),
                    groupType: 'asset'
                  });
              })
          };
        }
      },
      {
        groupType: 'upc',
        query: `
         upcAssets: Upc(upc: $token, limit: $limit, order_field: "title", order_type: "desc") {
            page_info {
              total
            }
            results {
              id: pk
              title
              upc
              image: item {
                url
              }
            }
        }
        `,
        getStateGroup: (response: any): StateGroup => {
          return {
            groupTitle: 'Upc',
            groupType: 'asset',
            groupItems:
              _.map(
                _.get(response, 'upcAssets.results', []),
                asset => {
                  return _.assign(
                    {},
                    asset,
                    {
                      image: asset.image.url || './assets/images/covers/vynil.svg',
                      groupType: 'asset'
                    });
                })
          };
        }
      },
      {
        groupType: 'genre',
        query: `
        genre: Genres(name: $token, limit: $limit, order_field: "name", order_type: "desc") {
          page_info {
            total
          }

          results {
            id
            title: name
          }
        }
      `,
        getStateGroup: (response: any): StateGroup => {
          return {
            groupTitle: 'Genres',
            groupType: 'genre',
            groupItems:
              _.map(
                _.get(response, 'genre.results', []),
                (genre) => {
                  return _.assign(
                    {},
                    genre,
                    {
                      image: null,
                      groupType: 'genre'
                    });
                }
              )
          };
        }
      },
      {
        groupType: 'company',
        query: `
        companies: Companies(name: $token, limit: $limit, order: "name_desc") {
            page_info {
              total
            }
            results {
              id
              title: name
              image: logo {
                url
              }
            }
        }
        `,
        getStateGroup: (response: any): StateGroup => {
          return {
            groupTitle: 'Companies',
            groupType: 'company',
            groupItems:
              _.map(
                _.get(response, 'companies.results', []),
                (company) => {
                  return _.assign(
                    {},
                    company,
                    {
                      image: company.image.url,
                      groupType: 'company'
                    }
                  );
                }
              )

          };
        }
      },
      {
        groupType: 'artist',
        query: `
        artists: Artists(name: $token, limit: $limit, order: "name_desc") {
          page_info {
              total
          }
          results {
              id
              title: name
              image: item {
                url
              }
          }
        }
        `,
        getStateGroup: (response: any): StateGroup => {
          return {
            groupTitle: 'Artists',
            groupType: 'artist',
            groupItems:
              _.map(
                _.get(response, 'artists.results', []),
                (artist) => {
                  return _.assign(
                    {},
                    artist,
                    {
                      image: artist.image.url || './assets/images/navbar/person-negative.svg',
                      groupType: 'artist'
                    });
                }
              )
          };
        }
      },
      {
        groupType: 'country',
        query: `
        countries: Countries(name: $token, limit: $limit) {
          page_info {
              total
          }
          results {
              id: value
              title: printable_name
          }
        }
        `,
        getStateGroup: (response: any): StateGroup => {
          return {
            groupTitle: 'Countries',
            groupType: 'country',
            groupItems:
              _.map(
                _.sortBy(_.get(response, 'countries.results', []), [(o) => o.title]),
                country => {
                  return _.assign(
                    {},
                    country,
                    {
                      groupType: 'country',
                      image: `https://www.countryflags.io/${country.id}/flat/64.png`
                    });
                }
              )
          };
        }
      },

      {
        groupType: 'storefront',
        query: `
        storefronts: StoreFronts(name: $token, limit: $limit) {
        page_info {
          total
        }
        results {
            id: pk,
            title:name,
            image: item {
                url
            }
            source: source {
              name
            }
        }
      }
        `,
        getStateGroup: (response: any): StateGroup => {
          return {
            groupTitle: 'Music Services',
            groupType: 'storefront',
            groupItems:
              _.map(
                _.sortBy(_.get(response, 'storefronts.results', []), [(o) => o.title]),
                item => {
                const title = item.title.split(' ');
                let service = 'default';

                if (title.length === 1) {
                  service = title;
                } else {
                  service = title.slice(0, title.length - 1).join('').toLowerCase();
                }

                  return _.assign(
                    {},
                    item,
                    {
                  groupType: 'storefront',
                  image: './assets/images/service_logo/' + service + '.svg'
                });
              })
          };
        }
      }
    );
  }

  ngOnInit() {
    this.debug.emit(this);

    this.searchSubscription = this.main$
      .pipe(
        filter((token: SearchToken) => {
          return token && token.type !== 'FREE';
        }),
        map((token: SearchToken) => {
          const query = this.buildQuery(token);
          if (!query) {
            return NEVER;
          }

          return this.apollo.watchQuery<any>({
            fetchPolicy: 'no-cache',
            query: query,
            variables: {token: token.value.value, limit: this.queryLimit}
          }).valueChanges.pipe(
            catchError(() => of(null)),
            filter((res: any): boolean => !!res),
            map((res: any): any => res.data),
            map((response: any): StateGroup[] => {
              return this.queryFinders
                .filter((finder: QueryFinder) => this.allowToFind(finder.groupType))
                .map((finder: QueryFinder): StateGroup => finder.getStateGroup(response));
            })
          );
        }),
        switchMap((searchStream: any) => this.searchBar.executeSearchQuery(searchStream))
      ).subscribe(() => {
      console.log('end');
    });

  }

  updateSearchToken(token: SearchToken) {
    if (this.searchQueriesAllowed.length === 0) {
      // throw new Error('should have at least one allowed query');
      return;
    }

    this.mainSubject.next(token);
  }

  updateChips($event: any) {

  }

  clearChips($event: any) {

  }

  setItems(items) {
    this.searchBar.setItems(items);
  }

  private allowToFind(groupType) {
    const queryAllowed = this.searchQueriesAllowed.includes(groupType);
    if (this.allowMultipleSearchTypes) {
      return queryAllowed;
    } else {
      const inChipIndex = _.findIndex(this.searchBar.getChips(), (chip: Chip) => chip.type === groupType);
      return inChipIndex === -1 && queryAllowed;
    }
  }

  private buildQuery(token: SearchToken): any {
    const { type } = token;
    if (type === 'GENERAL') {
      const queries = this.queryFinders
        .filter((finder: QueryFinder) => this.allowToFind(finder.groupType))
        .map(finder => finder.query);
      return gql`query RootQuery(
          $token: String,
        $limit: Int!
              ) {
                  ${queries.concat('\r\n')}
              }
          `;
    }
  }
}
