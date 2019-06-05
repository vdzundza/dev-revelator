import {addParameters, moduleMetadata, storiesOf} from '@storybook/angular';
import {action} from '@storybook/addon-actions';
import {boolean, button, number, object, optionsKnob as options, text, withKnobs} from '@storybook/addon-knobs';
import {SearchBarComponent} from 'src/app/search-bar/search-bar.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NO_ERRORS_SCHEMA} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AngularMaterialModule} from 'src/app/angular-material/angular-material.module';
import {NoopAnimationsModule} from '@angular/platform-browser/animations';
import {AssetsSearchBarComponent} from '../app/assets-search-bar/assets-search-bar.component';
import {APOLLO_OPTIONS} from 'apollo-angular';
import {HttpLink, HttpLinkModule} from 'apollo-angular-link-http';
import {InMemoryCache} from 'apollo-cache-inmemory';
import {GraphQLModule} from '../app/graphql.module';
import {HttpClientModule, HttpHeaders} from '@angular/common/http';
import {concat} from 'apollo-link';
import {token} from './token';
import {rxjs} from 'apollo-link-rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {OptGroupToOptPipe} from '../app/optgroup-pipe/optgroup.pipe';

addParameters({
  options: {
    panelPosition: 'right'
  }
});

let tokenDevProps = { email: '', password: '' };

const getTokenDevProps = () => {
  tokenDevProps = {
    email: text('email', 'Victor+clear@revelator.com', 'credentials'),
    password: text('password', 'Test_123', 'credentials'),
  };
  return tokenDevProps;
};

let chipProps = {
  chipType: 'title',
  chipValue: 'Asset 1'
};

const getChipProps = () => {
  chipProps = {
    chipType: text('Chip type', 'title', 'Chips'),
    chipValue: text('Chip value', 'Asset 1', 'Chips'),
    ...button('Add Chip', () => {
      component.addChip({type: chipProps.chipType, value: {title: chipProps.chipValue}});
    }, 'Chips'),
  };
  return chipProps;
};


const searchConfig = 'Search';

const valuesObj = {
  Assets: 'asset',
  Artists: 'artist',
  Companies: 'company',
  Genres: 'genre',
  Upc: 'upc',
  Country: 'country',
  'Music Service': 'storefront'
};

let init = false;

// const defaultValue = {
//   array: [
//     {
//       groupTitle: 'Assets',
//       groupItems: []
//     },
//     {
//       groupTitle: 'Companies',
//       groupItems: []
//     },
//     {
//       groupTitle: 'Artists',
//       groupItems: []
//     }
//   ]
// };
// const dataGroup = 'Data';
// const groupedDataKnob = object('Grouped Data', defaultValue, dataGroup);

const defaultProps = () => ({
  placeholder: text('Label', 'Search', 'Basic'),
  selectable: boolean('Selectable', true, 'Basic'),
  removable: boolean('Removable', true, 'Basic'),
  addOnBlur: boolean('Add on blur', true, 'Basic'),
  noDataText: text('No Data ', 'No Items match your search', 'Basic'),
  updateChips: action('Update Chips'),
  clearChips: action('Clear Chips'),

  debug: (cmp) => {
    if (init) {
      return;
    }
    action('debug init', {limit: 0})(cmp);
    component = cmp;
    // setTimeout(() => component.setItems(defaultValue.array), 0);
    init = true;
  }
});


const stories = storiesOf('Search Bar', module);
stories.addDecorator(withKnobs);

stories.addDecorator(moduleMetadata(
  {
    declarations: [
      SearchBarComponent,
      AssetsSearchBarComponent,
      OptGroupToOptPipe
    ],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      {
        provide: APOLLO_OPTIONS,
        useFactory: (httpLink: HttpLink) => {
          const http = httpLink.create({ uri: 'https://dev2-gw.revelator.tech/api/webapi/graphqlv2/' });
          const rxjsLink = rxjs({
            onResult: (obs) => obs,
            onOperation: (obs) => {
              return obs.pipe(
                switchMap((operation) => {
                  return token(tokenDevProps.email, tokenDevProps.password).pipe(
                    tap((accessToken) => {
                      operation.setContext({
                        headers: new HttpHeaders().set('Authorization', `Bearer ${accessToken}`)
                      });
                    }),
                    map(() => operation)
                  );
                }));
            }
          });

          return {
            cache: new InMemoryCache(),
            link: concat(rxjsLink, http)
          };
        },
        deps: [HttpLink]
      }
    ],
    imports: [
      HttpLinkModule,
      HttpClientModule,
      GraphQLModule,
      FormsModule,
      NoopAnimationsModule,
      CommonModule,
      ReactiveFormsModule,
      AngularMaterialModule
    ]
  }
));

type All = SearchBarComponent & AssetsSearchBarComponent;
let component: All = null;

stories
  .add('Remote Search', () => {
    const localProps = defaultProps();

    return {
      component: AssetsSearchBarComponent,
      props: Object.assign(
        {
          showSearchTerms: boolean('Show Search Term', true, searchConfig),
          searchTermsHelp: text('Search Terms Help', 'Search help...', searchConfig),
          freeTextSearchType: text('Free Text Search Type', 'title', searchConfig),
          allowDuplicates: boolean('Allow Duplicates', false, searchConfig),
          allowMultipleSearchTypes: boolean('Allow Multiple Types', true, searchConfig),
          showGroups: boolean('Show Groups', false, searchConfig),
          showTypeInfo: boolean('Show Type Information', false, searchConfig),
          debounceTime: number('Debounce Time (ms)', 400, {
            range: true,
            min: 300,
            max: 1000,
            step: 50
          }, searchConfig),
          queryLimit: number('Graphql query limit', 20, {
            range: true,
            min: 1,
            max: 100,
            step: 5
          }, 'graphql'),
          searchQueries: options('Search Queries',
            valuesObj, ['storefront', 'country', 'asset', 'genre', 'company', 'artist', 'upc'], {display: 'multi-select'}, searchConfig),
          assetsOrder: options('Assets Order', {
            'Title Desc': 'title_desc',
            'Title Asc': 'title_asc',
            'No Order (default by back)': 'no',
          }, 'no', {display: 'select'}, 'graphql'),
        },
        localProps,
        getTokenDevProps(),
        {
          showDebug: boolean('Show Debug Info', false, 'Debug')
        }
      )
    };
  })
  ;
