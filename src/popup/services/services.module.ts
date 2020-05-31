import {
    APP_INITIALIZER,
    LOCALE_ID,
    NgModule,
} from '@angular/core';

import { ToasterModule } from 'angular2-toaster';

import { LaunchGuardService } from './launch-guard.service';

import { AuthGuardService } from 'jslib/angular/services/auth-guard.service';
import { BroadcasterService } from 'jslib/angular/services/broadcaster.service';
import { ValidationService } from 'jslib/angular/services/validation.service';

import { BrowserApi } from '../../browser/browserApi';

import { ApiService } from 'jslib/abstractions/api.service';
import { AppIdService } from 'jslib/abstractions/appId.service';
import { AuditService } from 'jslib/abstractions/audit.service';
import { AuthService as AuthServiceAbstraction } from 'jslib/abstractions/auth.service';
import { CipherService } from 'jslib/abstractions/cipher.service';
import { CollectionService } from 'jslib/abstractions/collection.service';
import { CryptoService } from 'jslib/abstractions/crypto.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { EventService } from 'jslib/abstractions/event.service';
import { ExportService } from 'jslib/abstractions/export.service';
import { FolderService } from 'jslib/abstractions/folder.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { NotificationsService } from 'jslib/abstractions/notifications.service';
import { PasswordGenerationService } from 'jslib/abstractions/passwordGeneration.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { PolicyService } from 'jslib/abstractions/policy.service';
import { SearchService as SearchServiceAbstraction } from 'jslib/abstractions/search.service';
import { SettingsService } from 'jslib/abstractions/settings.service';
import { StateService as StateServiceAbstraction } from 'jslib/abstractions/state.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { SyncService } from 'jslib/abstractions/sync.service';
import { TokenService } from 'jslib/abstractions/token.service';
import { TotpService } from 'jslib/abstractions/totp.service';
import { UserService } from 'jslib/abstractions/user.service';
import { VaultTimeoutService } from 'jslib/abstractions/vaultTimeout.service';

import { AutofillService } from '../../services/abstractions/autofill.service';
import BrowserMessagingService from '../../services/browserMessaging.service';

import { AuthService } from 'jslib/services/auth.service';
import { ConstantsService } from 'jslib/services/constants.service';
import { SearchService } from 'jslib/services/search.service';
import { StateService } from 'jslib/services/state.service';

import { Analytics } from 'jslib/misc/analytics';

import { PopupSearchService } from './popup-search.service';
import { PopupUtilsService } from './popup-utils.service';

function getBgService<T>(service: string) {
    return (): T => {
        const page = BrowserApi.getBackgroundPage();
        return page ? page.bitwardenMain[service] as T : null;
    };
}

export const stateService = new StateService();
export const messagingService = new BrowserMessagingService();
export const authService = new AuthService(getBgService<CryptoService>('cryptoService')(),
    getBgService<ApiService>('apiService')(), getBgService<UserService>('userService')(),
    getBgService<TokenService>('tokenService')(), getBgService<AppIdService>('appIdService')(),
    getBgService<I18nService>('i18nService')(), getBgService<PlatformUtilsService>('platformUtilsService')(),
    messagingService);
export const searchService = new PopupSearchService(getBgService<SearchService>('searchService')(),
    getBgService<CipherService>('cipherService')(), getBgService<PlatformUtilsService>('platformUtilsService')());

export function initFactory(i18nService: I18nService, storageService: StorageService,
    popupUtilsService: PopupUtilsService): Function {
    return async () => {
        if (!popupUtilsService.inPopup(window)) {
            window.document.body.classList.add('body-full');
        } else if (window.screen.availHeight < 600) {
            window.document.body.classList.add('body-xs');
        } else if (window.screen.availHeight <= 800) {
            window.document.body.classList.add('body-sm');
        }

        if (BrowserApi.getBackgroundPage() != null) {
            stateService.save(ConstantsService.disableFaviconKey,
                await storageService.get<boolean>(ConstantsService.disableFaviconKey));

            let theme = await storageService.get<string>(ConstantsService.themeKey);
            if (theme == null) {
                theme = 'light';
            }

            const i18nServiceAsAny = i18nService as any;
            const translationLocale = i18nServiceAsAny.isPrivateBrowsingProxy ?
                await i18nServiceAsAny.translationLocale.getRawValue :
                i18nServiceAsAny.translationLocale;
            window.document.documentElement.classList.add('locale_' + translationLocale);
            window.document.documentElement.classList.add('theme_' + theme);

            await authService.init();

            const analytics = new Analytics(window, () => BrowserApi.gaFilter(), null, null, null, () => {
                const bgPage = BrowserApi.getBackgroundPage();
                if (bgPage == null || bgPage.bitwardenMain == null) {
                    throw new Error('Cannot resolve background page main.');
                }
                return bgPage.bitwardenMain;
            });
        }
    };
}

@NgModule({
    imports: [
        ToasterModule,
    ],
    declarations: [],
    providers: [
        ValidationService,
        AuthGuardService,
        LaunchGuardService,
        PopupUtilsService,
        BroadcasterService,
        { provide: MessagingService, useValue: messagingService },
        { provide: AuthServiceAbstraction, useValue: authService },
        { provide: StateServiceAbstraction, useValue: stateService },
        { provide: SearchServiceAbstraction, useValue: searchService },
        { provide: AuditService, useFactory: getBgService<AuditService>('auditService'), deps: [] },
        { provide: CipherService, useFactory: getBgService<CipherService>('cipherService'), deps: [] },
        { provide: FolderService, useFactory: getBgService<FolderService>('folderService'), deps: [] },
        { provide: CollectionService, useFactory: getBgService<CollectionService>('collectionService'), deps: [] },
        { provide: EnvironmentService, useFactory: getBgService<EnvironmentService>('environmentService'), deps: [] },
        { provide: TotpService, useFactory: getBgService<TotpService>('totpService'), deps: [] },
        { provide: TokenService, useFactory: getBgService<TokenService>('tokenService'), deps: [] },
        { provide: I18nService, useFactory: getBgService<I18nService>('i18nService'), deps: [] },
        { provide: CryptoService, useFactory: getBgService<CryptoService>('cryptoService'), deps: [] },
        { provide: EventService, useFactory: getBgService<EventService>('eventService'), deps: [] },
        { provide: PolicyService, useFactory: getBgService<PolicyService>('policyService'), deps: [] },
        {
            provide: PlatformUtilsService,
            useFactory: getBgService<PlatformUtilsService>('platformUtilsService'),
            deps: [],
        },
        {
            provide: PasswordGenerationService,
            useFactory: getBgService<PasswordGenerationService>('passwordGenerationService'),
            deps: [],
        },
        { provide: ApiService, useFactory: getBgService<ApiService>('apiService'), deps: [] },
        { provide: SyncService, useFactory: getBgService<SyncService>('syncService'), deps: [] },
        { provide: UserService, useFactory: getBgService<UserService>('userService'), deps: [] },
        { provide: SettingsService, useFactory: getBgService<SettingsService>('settingsService'), deps: [] },
        { provide: StorageService, useFactory: getBgService<StorageService>('storageService'), deps: [] },
        { provide: AppIdService, useFactory: getBgService<AppIdService>('appIdService'), deps: [] },
        { provide: AutofillService, useFactory: getBgService<AutofillService>('autofillService'), deps: [] },
        { provide: ExportService, useFactory: getBgService<ExportService>('exportService'), deps: [] },
        {
            provide: VaultTimeoutService,
            useFactory: getBgService<VaultTimeoutService>('vaultTimeoutService'),
            deps: [],
        },
        {
            provide: NotificationsService,
            useFactory: getBgService<NotificationsService>('notificationsService'),
            deps: [],
        },
        {
            provide: APP_INITIALIZER,
            useFactory: initFactory,
            deps: [I18nService, StorageService, PopupUtilsService],
            multi: true,
        },
        {
            provide: LOCALE_ID,
            useFactory: () => getBgService<I18nService>('i18nService')().translationLocale,
            deps: [],
        },
    ],
})
export class ServicesModule {
}
