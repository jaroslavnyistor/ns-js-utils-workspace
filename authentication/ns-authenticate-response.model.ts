import { Data } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { NsDateTime } from '../dates/ns-date-time';
import { nsIsNotNullOrEmpty, nsIsNullOrEmpty, nsJoin } from '../helpers/strings/ns-helpers-strings';
import { NsAuthenticateResponseEntity } from './ns-authenticate-response.entity';
import { NsAuthenticateRouteData } from './ns-authenticate-route-data';

const statusIntervalMs = 15 * 1000;

export class NsAuthenticateResponseModel {
   private readonly _isLoggedIn$: BehaviorSubject<boolean>;
   private readonly _loginExpired$: BehaviorSubject<boolean>;
   private readonly _changes$: BehaviorSubject<NsAuthenticateResponseModel>;

   private _entity: NsAuthenticateResponseEntity;
   private _expires: NsDateTime;
   private _fullName: string;
   private _hasToken: boolean;
   private _intervalId: number;

   get isLoggedIn(): boolean {
      return this._isLoggedIn$.value;
   }

   get isLoggedIn$(): Observable<boolean> {
      return this._isLoggedIn$;
   }

   get loginExpired$(): BehaviorSubject<boolean> {
      return this._loginExpired$;
   }

   get changes$(): Observable<NsAuthenticateResponseModel> {
      return this._changes$;
   }

   get fullName(): string {
      return this._fullName;
   }

   get userName(): string {
      return this._entity.userName;
   }

   get email(): string {
      return this._entity.email;
   }

   get id(): number {
      return this._entity.id;
   }

   constructor() {
      this._isLoggedIn$ = new BehaviorSubject<boolean>(false);
      this._loginExpired$ = new BehaviorSubject<boolean>(false);
      this._changes$ = new BehaviorSubject<NsAuthenticateResponseModel>(this);

      this._intervalId = window.setInterval(
         () => this.checkTokenExpiration(),
         statusIntervalMs
      );
   }

   private checkTokenExpiration() {
      const isLoggedIn = this.getIsLoggedIn();
      const hasValueChanged = this._isLoggedIn$.value !== isLoggedIn;

      if (hasValueChanged) {
         this._isLoggedIn$.next(isLoggedIn);
      }

      this.validateTokenExpiration();
   }

   private validateTokenExpiration() {
      if (this._hasToken && !this.getIsLoggedIn()) {
         this._loginExpired$.next(true);
      }
   }

   update(entity: NsAuthenticateResponseEntity) {
      const isNewToken = (this._entity == null || nsIsNullOrEmpty(this._entity.token))
         && nsIsNotNullOrEmpty(entity.token);

      this._entity = entity;

      this._expires = NsDateTime.from(this._entity.expires);
      this._fullName = nsJoin(' ', [this._entity.firstName, this._entity.lastName]);
      this._hasToken = nsIsNotNullOrEmpty(this._entity.token);

      this._changes$.next(this);

      this._isLoggedIn$.next(this.getIsLoggedIn());

      if (isNewToken) {
         this._loginExpired$.next(false);
      }

      this.validateTokenExpiration();
   }

   private getIsLoggedIn(): boolean {
      return this._hasToken && !this.hasTokenExpired();
   }

   private hasTokenExpired(): boolean {
      return this._expires.isBefore(NsDateTime.from());
   }

   hasPermission(data: NsAuthenticateRouteData | Data) {
      if (data == null || data.permission == null) {
         return true;
      }

      const permissionId = data.permission;
      return this.hasPermissionById(permissionId);
   }

   hasPermissionById(permissionId: number) {
      return permissionId === 0 || this._entity.permissions.some(id => id === permissionId);
   }
}
