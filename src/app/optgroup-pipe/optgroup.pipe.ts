import {Pipe, PipeTransform} from '@angular/core';
import {StateGroup} from '../search-bar/search-bar.component';
import * as _ from 'lodash';

@Pipe({name: 'optGroupToOpt'})
export class OptGroupToOptPipe implements PipeTransform {
  transform(value: StateGroup[]): any[] {
    if (value.length === 0) {
      return [];
    }

    return _.reduce(value, (prev, curr) => {
      return prev.concat([...curr.groupItems]);
    }, []);
  }
}
