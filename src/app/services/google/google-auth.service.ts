import { inject, Injectable } from '@angular/core';
import { loadGapiInsideDOM } from 'gapi-script';
import { environment } from '../../../environments/environment';
import { ActivatedRoute, Router } from '@angular/router';

declare const gapi: any;

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private gapi: any;
  private route = inject(ActivatedRoute);

  constructor() {
    //this.loadGapi();
    console.log(this.route.snapshot.queryParamMap.get('code'));
  }

  private loadGapi() {
    loadGapiInsideDOM().then(() => {
      const w = window as any;
      this.gapi = w.gapi;
      this.gapi.load('client:auth2', this.initClient);
    });
  }

  private initClient = () => {
    this.gapi.client
      .init({
        client_id: environment.googleClientId,
        prompt: 'consent',
        access_type: 'offline',
        scope:
          'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events',
      })
      .then(() => {
        console.log('Google API Client Initialized');
      });

    const code = this.route.snapshot.queryParamMap.get('code');

    if (code) {
      fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        body: new URLSearchParams({
          code: code || '', // Az OAuth hitelesítési kód
          client_id: environment.googleClientId,
          client_secret: environment.googleClientSecret,
          redirect_uri: 'http://localhost:4200',
          grant_type: 'authorization_code',
          access_type: 'offline',
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          console.log(data); // Itt lesz az access_token és refresh_token
        });
    }
  };

  public signIn() {
    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${environment.googleClientId}` +
      `&redirect_uri=http://localhost:4200` +
      `&response_type=code` +
      `&scope=https://www.googleapis.com/auth/calendar` +
      `&access_type=offline`;
    /*  this.gapi.auth2
      .getAuthInstance()
      .signIn()
      .then((googleUser: any) => {
        const authResponse = googleUser.getAuthResponse();
        console.log('authResponse: ', authResponse);
      })
      .catch((error: any) => {
        console.error('Sign-in error:', error);
      }); */
  }

  public getGoogleApiToken(): string | null {
    return sessionStorage.getItem('googleApiToken');
  }
}
