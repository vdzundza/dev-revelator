import {Observable} from 'rxjs';

const state = {
  time: new Date(),
  access: null,
  email: '',
  password: '',
  isNew(email: string, password: string): boolean {
    const c = new Date();
    const diff = Math.abs(c.getTime() - this.time.getDate());
    const hours = Math.floor(diff / 3.6e5);
    const minutes = Math.floor(diff % 3.6e5) / 6e4;
    const seconds = Math.floor(diff % 6e4) / 1000;

    if (minutes > 5) {
      // console.log('refresh token after 5 minutes', {
      //   hours,
      //   minutes,
      //   seconds
      // });
      this.time = new Date();
      return true;
    }

    return this.email !== email || this.password !== password;
  }
};
export const token = (email: string, password: string): Observable<any> => new Observable((observer) => {
  // the consumer subscribes.
  if (state.isNew(email, password)) {
    state.access = null;
    state.email = email;
    state.password = password;
  }

  if (state.access) {
    observer.next(state.access);
    return {
      unsubscribe() {
        // console.log(`unsubscribe with ${state.access}`);
      }
    };
  }

  const data = JSON.stringify({
    email: email,
    password: password,
    force: true
  });

  let xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  const listener = (function listenerInner() {
    if (this.readyState === 4) {
      state.access = JSON.parse(this.responseText).access;
      observer.next(state.access);
    }
  }).bind(xhr);

  xhr.addEventListener('readystatechange', listener);

  xhr.open('POST', 'https://dev2-gw.revelator.tech/api/accounts/auth/login/');
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.setRequestHeader('Accept', '*/*');
  xhr.setRequestHeader('Cache-Control', 'no-cache');

  xhr.send(data);

  return {
    unsubscribe() {
      xhr.removeEventListener('readystatechange', listener);
      xhr = null;
    }
  };
});
