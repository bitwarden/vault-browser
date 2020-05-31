import { CipherType } from 'jslib/enums';

import {
    ApiService,
    AppIdService,
    AuditService,
    CipherService,
    CollectionService,
    ConstantsService,
    ContainerService,
    CryptoService,
    EnvironmentService,
    FolderService,
    PasswordGenerationService,
    SettingsService,
    SyncService,
    TokenService,
    TotpService,
    UserService,
    VaultTimeoutService,
} from 'jslib/services';
import { EventService } from 'jslib/services/event.service';
import { ExportService } from 'jslib/services/export.service';
import { NotificationsService } from 'jslib/services/notifications.service';
import { PolicyService } from 'jslib/services/policy.service';
import { SearchService } from 'jslib/services/search.service';
import { SystemService } from 'jslib/services/system.service';
import { WebCryptoFunctionService } from 'jslib/services/webCryptoFunction.service';

import {
    ApiService as ApiServiceAbstraction,
    AppIdService as AppIdServiceAbstraction,
    AuditService as AuditServiceAbstraction,
    CipherService as CipherServiceAbstraction,
    CollectionService as CollectionServiceAbstraction,
    CryptoService as CryptoServiceAbstraction,
    EnvironmentService as EnvironmentServiceAbstraction,
    FolderService as FolderServiceAbstraction,
    I18nService as I18nServiceAbstraction,
    MessagingService as MessagingServiceAbstraction,
    PasswordGenerationService as PasswordGenerationServiceAbstraction,
    PlatformUtilsService as PlatformUtilsServiceAbstraction,
    SettingsService as SettingsServiceAbstraction,
    StorageService as StorageServiceAbstraction,
    SyncService as SyncServiceAbstraction,
    TokenService as TokenServiceAbstraction,
    TotpService as TotpServiceAbstraction,
    UserService as UserServiceAbstraction,
    VaultTimeoutService as VaultTimeoutServiceAbstraction,
} from 'jslib/abstractions';
import { EventService as EventServiceAbstraction } from 'jslib/abstractions/event.service';
import { ExportService as ExportServiceAbstraction } from 'jslib/abstractions/export.service';
import { NotificationsService as NotificationsServiceAbstraction } from 'jslib/abstractions/notifications.service';
import { PolicyService as PolicyServiceAbstraction } from 'jslib/abstractions/policy.service';
import { SearchService as SearchServiceAbstraction } from 'jslib/abstractions/search.service';
import { SystemService as SystemServiceAbstraction } from 'jslib/abstractions/system.service';

import { Analytics } from 'jslib/misc';
import { Utils } from 'jslib/misc/utils';

import { BrowserApi } from '../browser/browserApi';
import { SafariApp } from '../browser/safariApp';

import CommandsBackground from './commands.background';
import ContextMenusBackground from './contextMenus.background';
import IdleBackground from './idle.background';
import RuntimeBackground from './runtime.background';
import TabsBackground from './tabs.background';
import WebRequestBackground from './webRequest.background';
import WindowsBackground from './windows.background';

import AutofillService from '../services/autofill.service';
import BrowserMessagingService from '../services/browserMessaging.service';
import BrowserPlatformUtilsService from '../services/browserPlatformUtils.service';
import BrowserStorageService from '../services/browserStorage.service';
import I18nService from '../services/i18n.service';

import { AutofillService as AutofillServiceAbstraction } from '../services/abstractions/autofill.service';

import { FirefoxProxyReceiver } from '../firefox/privateBrowsingProxyServer';

export default class MainBackground {
    messagingService: MessagingServiceAbstraction;
    storageService: StorageServiceAbstraction;
    secureStorageService: StorageServiceAbstraction;
    i18nService: I18nServiceAbstraction;
    platformUtilsService: PlatformUtilsServiceAbstraction;
    constantsService: ConstantsService;
    cryptoService: CryptoServiceAbstraction;
    tokenService: TokenServiceAbstraction;
    appIdService: AppIdServiceAbstraction;
    apiService: ApiServiceAbstraction;
    environmentService: EnvironmentServiceAbstraction;
    userService: UserServiceAbstraction;
    settingsService: SettingsServiceAbstraction;
    cipherService: CipherServiceAbstraction;
    folderService: FolderServiceAbstraction;
    collectionService: CollectionServiceAbstraction;
    vaultTimeoutService: VaultTimeoutServiceAbstraction;
    syncService: SyncServiceAbstraction;
    passwordGenerationService: PasswordGenerationServiceAbstraction;
    totpService: TotpServiceAbstraction;
    autofillService: AutofillServiceAbstraction;
    containerService: ContainerService;
    auditService: AuditServiceAbstraction;
    exportService: ExportServiceAbstraction;
    searchService: SearchServiceAbstraction;
    notificationsService: NotificationsServiceAbstraction;
    systemService: SystemServiceAbstraction;
    eventService: EventServiceAbstraction;
    policyService: PolicyServiceAbstraction;
    analytics: Analytics;

    onUpdatedRan: boolean;
    onReplacedRan: boolean;
    loginToAutoFill: any = null;
    notificationQueue: any[] = [];

    private commandsBackground: CommandsBackground;
    private contextMenusBackground: ContextMenusBackground;
    private idleBackground: IdleBackground;
    private runtimeBackground: RuntimeBackground;
    private tabsBackground: TabsBackground;
    private webRequestBackground: WebRequestBackground;
    private windowsBackground: WindowsBackground;

    private sidebarAction: any;
    private buildingContextMenu: boolean;
    private menuOptionsLoaded: any[] = [];
    private syncTimeout: any;
    private isSafari: boolean;

    constructor() {
        // Services
        this.messagingService = new BrowserMessagingService();
        this.platformUtilsService = new BrowserPlatformUtilsService(this.messagingService,
            (clipboardValue, clearMs) => {
                if (this.systemService != null) {
                    this.systemService.clearClipboard(clipboardValue, clearMs);
                }
            });
        this.storageService = new BrowserStorageService(this.platformUtilsService);
        this.secureStorageService = new BrowserStorageService(this.platformUtilsService);
        this.i18nService = new I18nService(BrowserApi.getUILanguage(window));
        const cryptoFunctionService = new WebCryptoFunctionService(window, this.platformUtilsService);
        this.cryptoService = new CryptoService(this.storageService, this.secureStorageService, cryptoFunctionService);
        this.tokenService = new TokenService(this.storageService);
        this.appIdService = new AppIdService(this.storageService);
        this.apiService = new ApiService(this.tokenService, this.platformUtilsService,
            (expired: boolean) => this.logout(expired));
        this.userService = new UserService(this.tokenService, this.storageService);
        this.settingsService = new SettingsService(this.userService, this.storageService);
        this.cipherService = new CipherService(this.cryptoService, this.userService, this.settingsService,
            this.apiService, this.storageService, this.i18nService, () => this.searchService);
        this.folderService = new FolderService(this.cryptoService, this.userService, this.apiService,
            this.storageService, this.i18nService, this.cipherService);
        this.collectionService = new CollectionService(this.cryptoService, this.userService, this.storageService,
            this.i18nService);
        this.searchService = new SearchService(this.cipherService, this.platformUtilsService);
        this.policyService = new PolicyService(this.userService, this.storageService);
        this.vaultTimeoutService = new VaultTimeoutService(this.cipherService, this.folderService,
            this.collectionService, this.cryptoService, this.platformUtilsService, this.storageService,
            this.messagingService, this.searchService, this.userService, this.tokenService,
            async () => {
                if (this.notificationsService != null) {
                    this.notificationsService.updateConnection(false);
                }
                await this.setIcon();
                await this.refreshBadgeAndMenu(true);
                if (this.systemService != null) {
                    this.systemService.startProcessReload();
                    await this.systemService.clearPendingClipboard();
                }
            }, async () => await this.logout(false));
        this.syncService = new SyncService(this.userService, this.apiService, this.settingsService,
            this.folderService, this.cipherService, this.cryptoService, this.collectionService,
            this.storageService, this.messagingService, this.policyService,
            async (expired: boolean) => await this.logout(expired));
        this.eventService = new EventService(this.storageService, this.apiService, this.userService,
            this.cipherService);
        this.passwordGenerationService = new PasswordGenerationService(this.cryptoService, this.storageService,
            this.policyService);
        this.totpService = new TotpService(this.storageService, cryptoFunctionService);
        this.autofillService = new AutofillService(this.cipherService, this.userService, this.totpService,
            this.eventService);
        this.containerService = new ContainerService(this.cryptoService);
        this.auditService = new AuditService(cryptoFunctionService, this.apiService);
        this.exportService = new ExportService(this.folderService, this.cipherService, this.apiService);
        this.notificationsService = new NotificationsService(this.userService, this.syncService, this.appIdService,
            this.apiService, this.vaultTimeoutService, () => this.logout(true));
        this.environmentService = new EnvironmentService(this.apiService, this.storageService,
            this.notificationsService);
        this.analytics = new Analytics(window, () => BrowserApi.gaFilter(), this.platformUtilsService,
            this.storageService, this.appIdService);
        this.systemService = new SystemService(this.storageService, this.vaultTimeoutService,
            this.messagingService, this.platformUtilsService, () => {
                const forceWindowReload = this.platformUtilsService.isSafari() ||
                    this.platformUtilsService.isFirefox() || this.platformUtilsService.isOpera();
                BrowserApi.reloadExtension(forceWindowReload ? window : null);
                return Promise.resolve();
            });

        // Other fields
        this.isSafari = this.platformUtilsService.isSafari();
        this.sidebarAction = this.isSafari ? null : (typeof opr !== 'undefined') && opr.sidebarAction ?
            opr.sidebarAction : (window as any).chrome.sidebarAction;

        // Background
        this.runtimeBackground = new RuntimeBackground(this, this.autofillService, this.cipherService,
            this.platformUtilsService as BrowserPlatformUtilsService, this.storageService, this.i18nService,
            this.analytics, this.notificationsService, this.systemService, this.vaultTimeoutService);
        this.commandsBackground = new CommandsBackground(this, this.passwordGenerationService,
            this.platformUtilsService, this.analytics, this.vaultTimeoutService);

        if (!this.isSafari) {
            this.tabsBackground = new TabsBackground(this);
            this.contextMenusBackground = new ContextMenusBackground(this, this.cipherService,
                this.passwordGenerationService, this.analytics, this.platformUtilsService, this.vaultTimeoutService,
                this.eventService, this.totpService);
            this.idleBackground = new IdleBackground(this.vaultTimeoutService, this.storageService,
                this.notificationsService);
            this.webRequestBackground = new WebRequestBackground(this.platformUtilsService, this.cipherService,
                this.vaultTimeoutService);
            this.windowsBackground = new WindowsBackground(this);
        }

        if (BrowserApi.isFirefox) {
            const privateBrowsingProxyServer = new FirefoxProxyReceiver(this);
            browser.runtime.onMessage.addListener(privateBrowsingProxyServer.handleMessage);
        }
    }

    async bootstrap() {
        SafariApp.init();
        this.analytics.ga('send', 'pageview', '/background.html');
        this.containerService.attachToWindow(window);

        await (this.vaultTimeoutService as VaultTimeoutService).init(true);
        await (this.i18nService as I18nService).init();
        await (this.eventService as EventService).init(true);
        await this.runtimeBackground.init();
        await this.commandsBackground.init();

        if (!this.isSafari) {
            await this.tabsBackground.init();
            await this.contextMenusBackground.init();
            await this.idleBackground.init();
            await this.webRequestBackground.init();
            await this.windowsBackground.init();
        }

        return new Promise((resolve) => {
            setTimeout(async () => {
                await this.environmentService.setUrlsFromStorage();
                await this.setIcon();
                this.cleanupNotificationQueue();
                this.fullSync(true);
                setTimeout(() => this.notificationsService.init(this.environmentService), 2500);
                resolve();
            }, 500);
        });
    }

    async setIcon() {
        if (this.isSafari || (!chrome.browserAction && !this.sidebarAction)) {
            return;
        }

        const isAuthenticated = await this.userService.isAuthenticated();
        const locked = await this.vaultTimeoutService.isLocked();

        let suffix = '';
        if (!isAuthenticated) {
            suffix = '_gray';
        } else if (locked) {
            suffix = '_locked';
        }

        await this.actionSetIcon(chrome.browserAction, suffix);
        await this.actionSetIcon(this.sidebarAction, suffix);
    }

    async refreshBadgeAndMenu(forLocked: boolean = false) {
        if (this.isSafari || !chrome.windows || !chrome.contextMenus) {
            return;
        }

        const menuDisabled = await this.storageService.get<boolean>(ConstantsService.disableContextMenuItemKey);
        if (!menuDisabled) {
            await this.buildContextMenu();
        } else {
            await this.contextMenusRemoveAll();
        }

        if (forLocked) {
            await this.loadMenuAndUpdateBadgeForNoAccessState(!menuDisabled);
            this.onUpdatedRan = this.onReplacedRan = false;
            return;
        }

        const tab = await BrowserApi.getTabFromCurrentWindow();
        if (tab) {
            await this.contextMenuReady(tab, !menuDisabled);
        }
    }

    async logout(expired: boolean) {
        await this.eventService.uploadEvents();
        const userId = await this.userService.getUserId();

        await Promise.all([
            this.eventService.clearEvents(),
            this.syncService.setLastSync(new Date(0)),
            this.tokenService.clearToken(),
            this.cryptoService.clearKeys(),
            this.userService.clear(),
            this.settingsService.clear(userId),
            this.cipherService.clear(userId),
            this.folderService.clear(userId),
            this.collectionService.clear(userId),
            this.policyService.clear(userId),
            this.passwordGenerationService.clear(),
            this.vaultTimeoutService.clear(),
        ]);

        this.searchService.clearIndex();
        this.messagingService.send('doneLoggingOut', { expired: expired });

        await this.setIcon();
        await this.refreshBadgeAndMenu();
        await this.reseedStorage();
        this.notificationsService.updateConnection(false);
        this.systemService.startProcessReload();
        await this.systemService.clearPendingClipboard();
    }

    async collectPageDetailsForContentScript(tab: any, sender: string, frameId: number = null) {
        if (tab == null || !tab.id) {
            return;
        }

        if (await this.vaultTimeoutService.isLocked()) {
            return;
        }

        const options: any = {};
        if (frameId != null) {
            options.frameId = frameId;
        }

        BrowserApi.tabSendMessage(tab, {
            command: 'collectPageDetails',
            tab: tab,
            sender: sender,
        }, options);
    }

    async checkNotificationQueue(tab: any = null): Promise<any> {
        if (this.notificationQueue.length === 0) {
            return;
        }

        if (tab != null) {
            this.doNotificationQueueCheck(tab);
            return;
        }

        const currentTab = await BrowserApi.getTabFromCurrentWindow();
        if (currentTab != null) {
            this.doNotificationQueueCheck(currentTab);
        }
    }

    async openPopup() {
        // Chrome APIs cannot open popup

        // TODO: Do we need to open this popup?
        if (!this.isSafari) {
            return;
        }
        await SafariApp.sendMessageToApp('showPopover', null, true);
    }

    async reseedStorage() {
        if (!this.platformUtilsService.isChrome() && !this.platformUtilsService.isVivaldi() &&
            !this.platformUtilsService.isOpera()) {
            return;
        }

        const currentVaultTimeout = await this.storageService.get<number>(ConstantsService.vaultTimeoutKey);
        if (currentVaultTimeout == null) {
            return;
        }

        const getStorage = (): Promise<any> => new Promise((resolve) => {
            chrome.storage.local.get(null, (o: any) => resolve(o));
        });

        const clearStorage = (): Promise<void> => new Promise((resolve) => {
            chrome.storage.local.clear(() => resolve());
        });

        const storage = await getStorage();
        await clearStorage();

        for (const key in storage) {
            if (!storage.hasOwnProperty(key)) {
                continue;
            }
            await this.storageService.save(key, storage[key]);
        }
    }

    private async buildContextMenu() {
        if (this.isSafari || !chrome.contextMenus || this.buildingContextMenu) {
            return;
        }

        this.buildingContextMenu = true;
        await this.contextMenusRemoveAll();

        await this.contextMenusCreate({
            type: 'normal',
            id: 'root',
            contexts: ['all'],
            title: 'Bitwarden',
        });

        await this.contextMenusCreate({
            type: 'normal',
            id: 'autofill',
            parentId: 'root',
            contexts: ['all'],
            title: this.i18nService.t('autoFill'),
        });

        // Edge does not support writing to the clipboard from background
        if (!this.platformUtilsService.isEdge()) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'copy-username',
                parentId: 'root',
                contexts: ['all'],
                title: this.i18nService.t('copyUsername'),
            });

            await this.contextMenusCreate({
                type: 'normal',
                id: 'copy-password',
                parentId: 'root',
                contexts: ['all'],
                title: this.i18nService.t('copyPassword'),
            });

            if (await this.userService.canAccessPremium()) {
                await this.contextMenusCreate({
                    type: 'normal',
                    id: 'copy-totp',
                    parentId: 'root',
                    contexts: ['all'],
                    title: this.i18nService.t('copyVerificationCode'),
                });
            }

            await this.contextMenusCreate({
                type: 'separator',
                parentId: 'root',
            });

            await this.contextMenusCreate({
                type: 'normal',
                id: 'generate-password',
                parentId: 'root',
                contexts: ['all'],
                title: this.i18nService.t('generatePasswordCopied'),
            });
        }

        this.buildingContextMenu = false;
    }

    private async contextMenuReady(tab: any, contextMenuEnabled: boolean) {
        await this.loadMenuAndUpdateBadge(tab.url, tab.id, contextMenuEnabled);
        this.onUpdatedRan = this.onReplacedRan = false;
    }

    private async loadMenuAndUpdateBadge(url: string, tabId: number, contextMenuEnabled: boolean) {
        if (!url || (!chrome.browserAction && !this.sidebarAction)) {
            return;
        }

        this.actionSetBadgeBackgroundColor(chrome.browserAction);
        this.actionSetBadgeBackgroundColor(this.sidebarAction);

        this.menuOptionsLoaded = [];
        const locked = await this.vaultTimeoutService.isLocked();
        if (!locked) {
            try {
                const ciphers = await this.cipherService.getAllDecryptedForUrl(url);
                ciphers.sort((a, b) => this.cipherService.sortCiphersByLastUsedThenName(a, b));

                if (contextMenuEnabled) {
                    ciphers.forEach((cipher) => {
                        this.loadLoginContextMenuOptions(cipher);
                    });
                }

                let theText = '';
                if (ciphers.length > 0 && ciphers.length <= 9) {
                    theText = ciphers.length.toString();
                } else if (ciphers.length > 0) {
                    theText = '9+';
                } else {
                    if (contextMenuEnabled) {
                        await this.loadNoLoginsContextMenuOptions(this.i18nService.t('noMatchingLogins'));
                    }
                }

                this.browserActionSetBadgeText(theText, tabId);
                this.sidebarActionSetBadgeText(theText, tabId);
                return;
            } catch { }
        }

        await this.loadMenuAndUpdateBadgeForNoAccessState(contextMenuEnabled);
    }

    private async loadMenuAndUpdateBadgeForNoAccessState(contextMenuEnabled: boolean) {
        if (contextMenuEnabled) {
            const authed = await this.userService.isAuthenticated();
            await this.loadNoLoginsContextMenuOptions(this.i18nService.t(authed ? 'vaultLocked' : 'vaultLoggedOut'));
        }

        const tabs = await BrowserApi.getActiveTabs();
        if (tabs != null) {
            tabs.forEach((tab) => {
                if (tab.id != null) {
                    this.browserActionSetBadgeText('', tab.id);
                    this.sidebarActionSetBadgeText('', tab.id);
                }
            });
        }
    }

    private async loadLoginContextMenuOptions(cipher: any) {
        if (cipher == null || cipher.type !== CipherType.Login) {
            return;
        }

        let title = cipher.name;
        if (cipher.login.username && cipher.login.username !== '') {
            title += (' (' + cipher.login.username + ')');
        }
        await this.loadContextMenuOptions(title, cipher.id, cipher);
    }

    private async loadNoLoginsContextMenuOptions(noLoginsMessage: string) {
        await this.loadContextMenuOptions(noLoginsMessage, 'noop', null);
    }

    private async loadContextMenuOptions(title: string, idSuffix: string, cipher: any) {
        if (!chrome.contextMenus || this.menuOptionsLoaded.indexOf(idSuffix) > -1 ||
            (cipher != null && cipher.type !== CipherType.Login)) {
            return;
        }

        this.menuOptionsLoaded.push(idSuffix);

        if (cipher == null || (cipher.login.password && cipher.login.password !== '')) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'autofill_' + idSuffix,
                parentId: 'autofill',
                contexts: ['all'],
                title: this.sanitizeContextMenuTitle(title),
            });
        }

        if (cipher == null || (cipher.login.username && cipher.login.username !== '')) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'copy-username_' + idSuffix,
                parentId: 'copy-username',
                contexts: ['all'],
                title: this.sanitizeContextMenuTitle(title),
            });
        }

        if (cipher == null || (cipher.login.password && cipher.login.password !== '')) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'copy-password_' + idSuffix,
                parentId: 'copy-password',
                contexts: ['all'],
                title: this.sanitizeContextMenuTitle(title),
            });
        }

        const canAccessPremium = await this.userService.canAccessPremium();
        if (canAccessPremium && (cipher == null || (cipher.login.totp && cipher.login.totp !== ''))) {
            await this.contextMenusCreate({
                type: 'normal',
                id: 'copy-totp_' + idSuffix,
                parentId: 'copy-totp',
                contexts: ['all'],
                title: this.sanitizeContextMenuTitle(title),
            });
        }
    }

    private sanitizeContextMenuTitle(title: string): string {
        return title.replace(/&/g, '&&');
    }

    private cleanupNotificationQueue() {
        for (let i = this.notificationQueue.length - 1; i >= 0; i--) {
            if (this.notificationQueue[i].expires < new Date()) {
                this.notificationQueue.splice(i, 1);
            }
        }
        setTimeout(() => this.cleanupNotificationQueue(), 2 * 60 * 1000); // check every 2 minutes
    }

    private doNotificationQueueCheck(tab: any) {
        if (tab == null) {
            return;
        }

        const tabDomain = Utils.getDomain(tab.url);
        if (tabDomain == null) {
            return;
        }

        for (let i = 0; i < this.notificationQueue.length; i++) {
            if (this.notificationQueue[i].tabId !== tab.id || this.notificationQueue[i].domain !== tabDomain) {
                continue;
            }
            if (this.notificationQueue[i].type === 'addLogin') {
                BrowserApi.tabSendMessageData(tab, 'openNotificationBar', {
                    type: 'add',
                });
            } else if (this.notificationQueue[i].type === 'changePassword') {
                BrowserApi.tabSendMessageData(tab, 'openNotificationBar', {
                    type: 'change',
                });
            }
            break;
        }
    }

    private async fullSync(override: boolean = false) {
        const syncInternal = 6 * 60 * 60 * 1000; // 6 hours
        const lastSync = await this.syncService.getLastSync();

        let lastSyncAgo = syncInternal + 1;
        if (lastSync != null) {
            lastSyncAgo = new Date().getTime() - lastSync.getTime();
        }

        if (override || lastSyncAgo >= syncInternal) {
            await this.syncService.fullSync(override);
            this.scheduleNextSync();
        } else {
            this.scheduleNextSync();
        }
    }

    private scheduleNextSync() {
        if (this.syncTimeout) {
            clearTimeout(this.syncTimeout);
        }

        this.syncTimeout = setTimeout(async () => await this.fullSync(), 5 * 60 * 1000); // check every 5 minutes
    }

    // Browser API Helpers

    private contextMenusRemoveAll() {
        return new Promise((resolve) => {
            chrome.contextMenus.removeAll(() => {
                resolve();
                if (chrome.runtime.lastError) {
                    return;
                }
            });
        });
    }

    private contextMenusCreate(options: any) {
        return new Promise((resolve) => {
            chrome.contextMenus.create(options, () => {
                resolve();
                if (chrome.runtime.lastError) {
                    return;
                }
            });
        });
    }

    private async actionSetIcon(theAction: any, suffix: string): Promise<any> {
        if (!theAction || !theAction.setIcon) {
            return;
        }

        const options = {
            path: {
                19: 'images/icon19' + suffix + '.png',
                38: 'images/icon38' + suffix + '.png',
            },
        };

        if (this.platformUtilsService.isFirefox()) {
            await theAction.setIcon(options);
        } else {
            return new Promise((resolve) => {
                theAction.setIcon(options, () => resolve());
            });
        }
    }

    private actionSetBadgeBackgroundColor(action: any) {
        if (action && action.setBadgeBackgroundColor) {
            action.setBadgeBackgroundColor({ color: '#294e5f' });
        }
    }

    private browserActionSetBadgeText(text: string, tabId: number) {
        if (chrome.browserAction && chrome.browserAction.setBadgeText) {
            chrome.browserAction.setBadgeText({
                text: text,
                tabId: tabId,
            });
        }
    }

    private sidebarActionSetBadgeText(text: string, tabId: number) {
        if (!this.sidebarAction) {
            return;
        }

        if (this.sidebarAction.setBadgeText) {
            this.sidebarAction.setBadgeText({
                text: text,
                tabId: tabId,
            });
        } else if (this.sidebarAction.setTitle) {
            let title = 'Bitwarden';
            if (text && text !== '') {
                title += (' [' + text + ']');
            }

            this.sidebarAction.setTitle({
                title: title,
                tabId: tabId,
            });
        }
    }
}
