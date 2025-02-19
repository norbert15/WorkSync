import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, map, Observable, take, throwError } from 'rxjs';
import { loadGapiInsideDOM } from 'gapi-script';

import { environment } from '../../../environments/environment';

declare const gapi: any;

type GoogleTokenType = {
  access_token: string;
  scope: string;
  expires_in: number;
  token_type: string;
  refresh_token: string;
};

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  public readonly googleApiPayload$ = new BehaviorSubject<{
    accessToken: string;
    refreshToken: string;
  } | null>(null);

  private readonly googleConfig = environment.googleConfig;
  private readonly httpClient = inject(HttpClient);

  private readonly headers = new HttpHeaders({
    'Content-Type': 'application/x-www-form-urlencoded',
  });

  public navigateToGoogleAuthPage(): void {
    let url = window.location.href;
    const cleanUrl = url.split('?')[0];
    window.location.href =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.googleConfig.clientId}` +
      `&redirect_uri=${cleanUrl}` +
      `&response_type=code` +
      `&scope=${this.googleConfig.scope}` +
      `&access_type=offline`;
  }

  public getGoogleTokens(code: string): Observable<Partial<GoogleTokenType>> {
    let url = window.location.href;
    const cleanUrl = url.split('?')[0];
    const body = new HttpParams()
      .set('code', code)
      .set('client_id', this.googleConfig.clientId)
      .set('client_secret', this.googleConfig.clientSecret)
      .set('redirect_uri', cleanUrl)
      .set('grant_type', 'authorization_code')
      .set('access_type', 'offline');

    return this.httpClient.post('https://oauth2.googleapis.com/token', body.toString(), {
      headers: this.headers,
    });
  }

  public renewAccessToken(refreshToken: string): Observable<Partial<GoogleTokenType>> {
    const body = new HttpParams()
      .set('client_id', this.googleConfig.clientId)
      .set('client_secret', this.googleConfig.clientSecret)
      .set('grant_type', 'refresh_token')
      .set('refresh_token', refreshToken);

    return this.httpClient.post('https://oauth2.googleapis.com/token', body.toString(), {
      headers: this.headers,
    });
  }

  public revokeGoogleTokens(): Observable<void> {
    const params = new HttpParams().set(
      'token',
      this.googleApiPayload$.getValue()?.accessToken || '',
    );

    return this.httpClient.post<void>('https://oauth2.googleapis.com/revoke', params.toString(), {
      headers: this.headers,
    });
  }

  public setGoogleApiPayload(accessToken: string, refreshToken: string): void {
    this.googleApiPayload$.next({ accessToken, refreshToken });
  }
}
