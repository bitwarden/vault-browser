import { Angulartics2 } from 'angulartics2';
import Swal from 'sweetalert2/src/sweetalert2.js';

import {
    Component,
    ElementRef,
    OnInit,
    ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { CryptoService } from 'jslib/abstractions/crypto.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { UserService } from 'jslib/abstractions/user.service';
import { VaultTimeoutService } from 'jslib/abstractions/vaultTimeout.service';

import { DeviceType } from 'jslib/enums/deviceType';
import {
    LOCK_OPTION_SPECIAL_TYPE_VALUES,
    TIMEOUT_NEVER,
    TIMEOUT_ON_IDLE,
    TIMEOUT_ON_LOCKED,
    TIMEOUT_ON_RESTART,
    TIMEOUT_ON_SLEEP,
    TimeoutNonDurationType, TimeoutType, TimeoutValueType,
} from 'jslib/enums/timeoutType';

import { ConstantsService } from 'jslib/services/constants.service';

import { BrowserApi } from '../../browser/browserApi';

const RateUrls = {
    [DeviceType.ChromeExtension]:
        'https://chrome.google.com/webstore/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb/reviews',
    [DeviceType.FirefoxExtension]:
        'https://addons.mozilla.org/en-US/firefox/addon/bitwarden-password-manager/#reviews',
    [DeviceType.OperaExtension]:
        'https://addons.opera.com/en/extensions/details/bitwarden-free-password-manager/#feedback-container',
    [DeviceType.EdgeExtension]:
        'https://microsoftedge.microsoft.com/addons/detail/jbkfoedolllekgbhcbcoahefnbanhhlh',
    [DeviceType.VivaldiExtension]:
        'https://chrome.google.com/webstore/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb/reviews',
    [DeviceType.SafariExtension]:
        'https://apps.apple.com/app/bitwarden/id1352778147',
};

interface ITimeoutTypeModel {
    name: string;
    value: TimeoutType;
}

@Component({
    selector: 'app-settings',
    templateUrl: 'settings.component.html',
})
export class SettingsComponent implements OnInit {
    @ViewChild('vaultTimeoutSelect', {read: ElementRef}) vaultTimeoutSelectRef: ElementRef;
    @ViewChild('timeoutDurationInput') timeoutDurationRef: ElementRef;
    @ViewChild('vaultTimeoutActionSelect', {read: ElementRef}) vaultTimeoutActionSelectRef: ElementRef;
    // The lock option values shown in UI.
    selectedTimeoutType: TimeoutType;
    timeoutDurationMin: number = null;
    // The lock option in use.
    vaultTimeout: TimeoutValueType = null;
    vaultTimeouts: ITimeoutTypeModel[];
    vaultTimeoutActions: any[];
    vaultTimeoutAction: string;
    pin: boolean = null;
    previousVaultTimeout: TimeoutValueType = null;

    constructor(private platformUtilsService: PlatformUtilsService, private i18nService: I18nService,
                private analytics: Angulartics2, private vaultTimeoutService: VaultTimeoutService,
                private storageService: StorageService, public messagingService: MessagingService,
                private router: Router, private environmentService: EnvironmentService,
                private cryptoService: CryptoService, private userService: UserService) {
    }

    /**
     * @internal
     * Convert historically used old number lockOption into the typed one.
     */
    vaultTimeoutToTypedVaultTimeout(value: number | TimeoutValueType): TimeoutValueType {
        if (value === null) {
            return {type: 'never', value: null};
        } else if (typeof value === 'number') {
            switch (value) {
                case -1:
                    return TIMEOUT_ON_RESTART;
                case -2:
                    return TIMEOUT_ON_LOCKED;
                case -3:
                    return TIMEOUT_ON_SLEEP;
                case -4:
                    return TIMEOUT_ON_IDLE;
                default:
                    return {type: 'numMinute', value: this.scaleTimeoutMin(value)};
            }
        } else {
            return value;
        }
    }

    async changeTimeoutDuration(newValue: number) {
        const scaledValue = this.scaleTimeoutMin(newValue);
        this.timeoutDurationRef.nativeElement.value = scaledValue;
        this.timeoutDurationMin = scaledValue;
    }

    scaleTimeoutMin(value: number): number {
        if (value < 0) {
            return 0;
        }
        // Max to 24 hours
        if (value > 1440) {
            return 1440;
        }
        return value;
    }

    async saveTimeoutDuration() {
        await this.saveLockOption({type: 'numMinute', value: this.timeoutDurationMin});
    }

    async ngOnInit() {
        const showOnLocked = !this.platformUtilsService.isFirefox() && !this.platformUtilsService.isEdge()
            && !this.platformUtilsService.isSafari();

        this.vaultTimeouts = [];

        if (showOnLocked) {
            this.vaultTimeouts.push({name: this.i18nService.t('onLocked'), value: TIMEOUT_ON_LOCKED.type});
        }

        this.vaultTimeouts.push({name: this.i18nService.t('onRestart'), value: TIMEOUT_ON_RESTART.type});
        this.vaultTimeouts.push({name: this.i18nService.t('never'), value: TIMEOUT_NEVER.type});

        this.vaultTimeoutActions = [
            {name: this.i18nService.t('lock'), value: 'lock'},
            {name: this.i18nService.t('logOut'), value: 'logOut'},
        ];

        const storedTimeout =
            await this.storageService.get<number | TimeoutValueType>(ConstantsService.vaultTimeoutKey);
        let option = this.vaultTimeoutToTypedVaultTimeout(storedTimeout);

        if (option.type === TIMEOUT_ON_LOCKED.type && !showOnLocked) {
            option = TIMEOUT_ON_RESTART;
        }
        this.vaultTimeout = option;
        this.selectedTimeoutType = this.vaultTimeout.type;

        if (this.vaultTimeout.type === 'numMinute') {
            this.timeoutDurationMin = this.vaultTimeout.value;
            // TODO: Translation
            this.vaultTimeouts.push({
                name: 'Lock after specified minutes',
                value: 'numMinute',
            });
        } else {
            this.timeoutDurationMin = this.getDefaultTimeoutDuration();
            this.vaultTimeouts.push({
                name: 'Lock after specified minutes',
                value: 'numMinute',
            });
        }
        await this.changeTimeoutDuration(this.timeoutDurationMin);

        this.previousVaultTimeout = this.vaultTimeout;

        const action = await this.storageService.get<string>(ConstantsService.vaultTimeoutActionKey);
        this.vaultTimeoutAction = action == null ? 'lock' : action;

        const pinSet = await this.vaultTimeoutService.isPinLockSet();
        this.pin = pinSet[0] || pinSet[1];
    }

    /**
     * @internal
     * given that user didn't confirm their selection, revert the selection of lockOptionType
     */
    revertLockOptionTypeUISelection() {
        this.vaultTimeouts.forEach((option: any, i) => {
            if (option.value === this.vaultTimeout.type) {
                this.vaultTimeoutSelectRef.nativeElement.selectedIndex = i;
            }
        });

    }

    async saveVaultTimeoutType(newVaultTimeout: TimeoutType) {
        if (newVaultTimeout === null || newVaultTimeout === TIMEOUT_NEVER.type) {
            const confirmed = await this.platformUtilsService.showDialog(
                this.i18nService.t('neverLockWarning'), null,
                this.i18nService.t('yes'), this.i18nService.t('cancel'), 'warning');
            if (!confirmed) {
                this.revertLockOptionTypeUISelection();
                newVaultTimeout = this.vaultTimeout.type;
            }
        }

        this.selectedTimeoutType = newVaultTimeout;

        if (newVaultTimeout === null || newVaultTimeout !== 'numMinute') {
            const specialLockOptionType: TimeoutNonDurationType = newVaultTimeout as TimeoutNonDurationType;
            this.saveLockOption(LOCK_OPTION_SPECIAL_TYPE_VALUES.get(specialLockOptionType));
        }
    }

    async saveLockOption(lockType: TimeoutValueType) {
        this.previousVaultTimeout = this.vaultTimeout;
        this.vaultTimeout = lockType;
        await this.vaultTimeoutService.setVaultTimeoutOptions(
            this.vaultTimeout != null ? this.vaultTimeout : null,
            this.vaultTimeoutAction);

        if (this.previousVaultTimeout == null) {
            this.messagingService.send('bgReseedStorage');
        }
        this.selectedTimeoutType = this.vaultTimeout.type;
        if (this.vaultTimeout.type === 'numMinute') {
            this.timeoutDurationMin = this.vaultTimeout.value;
        }
    }

    async saveVaultTimeoutAction(newValue: string) {
        if (newValue === 'logOut') {
            const confirmed = await this.platformUtilsService.showDialog(
                this.i18nService.t('vaultTimeoutLogOutConfirmation'),
                this.i18nService.t('vaultTimeoutLogOutConfirmationTitle'),
                this.i18nService.t('yes'), this.i18nService.t('cancel'), 'warning');
            if (!confirmed) {
                this.vaultTimeoutActions.forEach((option: any, i) => {
                    if (option.value === this.vaultTimeoutAction) {
                        this.vaultTimeoutActionSelectRef.nativeElement.value = i + ': ' + this.vaultTimeoutAction;
                    }
                });
                return;
            }
        }
        this.vaultTimeoutAction = newValue;
        await this.vaultTimeoutService.setVaultTimeoutOptions(this.vaultTimeout != null ? this.vaultTimeout : null,
            this.vaultTimeoutAction);
    }

    getDefaultTimeoutDuration() {
        return 30;
    }

    async updatePin() {
        if (this.pin) {
            const div = document.createElement('div');
            const label = document.createElement('label');
            label.className = 'checkbox';
            const checkboxText = document.createElement('span');
            const restartText = document.createTextNode(this.i18nService.t('lockWithMasterPassOnRestart'));
            checkboxText.appendChild(restartText);
            label.innerHTML = '<input type="checkbox" id="master-pass-restart" checked>';
            label.appendChild(checkboxText);

            div.innerHTML =
                `<div class="swal2-text">${this.i18nService.t('setYourPinCode')}</div>` +
                '<input type="text" class="swal2-input" id="pin-val" autocomplete="off" ' +
                'autocapitalize="none" autocorrect="none" spellcheck="false" inputmode="verbatim">';

            (div.querySelector('#pin-val') as HTMLInputElement).placeholder = this.i18nService.t('pin');
            div.appendChild(label);

            const submitted = await Swal.fire({
                heightAuto: false,
                buttonsStyling: false,
                html: div,
                showCancelButton: true,
                cancelButtonText: this.i18nService.t('cancel'),
                showConfirmButton: true,
                confirmButtonText: this.i18nService.t('submit'),
            });

            let pin: string = null;
            let masterPassOnRestart: boolean = null;
            if (submitted.value) {
                pin = (document.getElementById('pin-val') as HTMLInputElement).value;
                masterPassOnRestart = (document.getElementById('master-pass-restart') as HTMLInputElement).checked;
            }
            if (pin != null && pin.trim() !== '') {
                const kdf = await this.userService.getKdf();
                const kdfIterations = await this.userService.getKdfIterations();
                const email = await this.userService.getEmail();
                const pinKey = await this.cryptoService.makePinKey(pin, email, kdf, kdfIterations);
                const key = await this.cryptoService.getKey();
                const pinProtectedKey = await this.cryptoService.encrypt(key.key, pinKey);
                if (masterPassOnRestart) {
                    const encPin = await this.cryptoService.encrypt(pin);
                    await this.storageService.save(ConstantsService.protectedPin, encPin.encryptedString);
                    this.vaultTimeoutService.pinProtectedKey = pinProtectedKey;
                } else {
                    await this.storageService.save(ConstantsService.pinProtectedKey, pinProtectedKey.encryptedString);
                }
            } else {
                this.pin = false;
            }
        }
        if (!this.pin) {
            await this.cryptoService.clearPinProtectedKey();
            await this.vaultTimeoutService.clear();
        }
    }

    async lock() {
        this.analytics.eventTrack.next({action: 'Lock Now'});
        await this.vaultTimeoutService.lock(true);
    }

    async logOut() {
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('logOutConfirmation'), this.i18nService.t('logOut'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            this.messagingService.send('logout');
        }
    }

    async changePassword() {
        this.analytics.eventTrack.next({action: 'Clicked Change Password'});
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('changeMasterPasswordConfirmation'), this.i18nService.t('changeMasterPassword'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/change-your-master-password/');
        }
    }

    async twoStep() {
        this.analytics.eventTrack.next({action: 'Clicked Two-step Login'});
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('twoStepLoginConfirmation'), this.i18nService.t('twoStepLogin'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/setup-two-step-login/');
        }
    }

    async share() {
        this.analytics.eventTrack.next({action: 'Clicked Share Vault'});
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('shareVaultConfirmation'), this.i18nService.t('shareVault'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/what-is-an-organization/');
        }
    }

    async webVault() {
        this.analytics.eventTrack.next({action: 'Clicked Web Vault'});
        let url = this.environmentService.getWebVaultUrl();
        if (url == null) {
            url = 'https://vault.bitwarden.com';
        }
        BrowserApi.createNewTab(url);
    }

    import() {
        this.analytics.eventTrack.next({action: 'Clicked Import Items'});
        BrowserApi.createNewTab('https://help.bitwarden.com/article/import-data/');
    }

    export() {
        if (this.platformUtilsService.isEdge()) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/export-your-data/');
            return;
        }

        this.router.navigate(['/export']);
    }

    help() {
        this.analytics.eventTrack.next({action: 'Clicked Help and Feedback'});
        BrowserApi.createNewTab('https://help.bitwarden.com/');
    }

    about() {
        this.analytics.eventTrack.next({action: 'Clicked About'});

        const year = (new Date()).getFullYear();
        const versionText = document.createTextNode(
            this.i18nService.t('version') + ': ' + BrowserApi.getApplicationVersion());
        const div = document.createElement('div');
        div.innerHTML = `<p class="text-center"><i class="fa fa-shield fa-3x" aria-hidden="true"></i></p>
            <p class="text-center"><b>Bitwarden</b><br>&copy; Bitwarden Inc. 2015-` + year + `</p>`;
        div.appendChild(versionText);

        Swal.fire({
            heightAuto: false,
            buttonsStyling: false,
            html: div,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: this.i18nService.t('close'),
        });
    }

    async fingerprint() {
        this.analytics.eventTrack.next({action: 'Clicked Fingerprint'});

        const fingerprint = await this.cryptoService.getFingerprint(await this.userService.getUserId());
        const p = document.createElement('p');
        p.innerText = this.i18nService.t('yourAccountsFingerprint') + ':';
        const p2 = document.createElement('p');
        p2.innerText = fingerprint.join('-');
        const div = document.createElement('div');
        div.appendChild(p);
        div.appendChild(p2);

        const result = await Swal.fire({
            heightAuto: false,
            buttonsStyling: false,
            html: div,
            showCancelButton: true,
            cancelButtonText: this.i18nService.t('close'),
            showConfirmButton: true,
            confirmButtonText: this.i18nService.t('learnMore'),
        });

        if (result.value) {
            this.platformUtilsService.launchUri('https://help.bitwarden.com/article/fingerprint-phrase/');
        }
    }

    rate() {
        this.analytics.eventTrack.next({action: 'Rate Extension'});
        let deviceType = this.platformUtilsService.getDevice();
        if (window.navigator.userAgent.indexOf('Edg/') > -1) {
            deviceType = DeviceType.EdgeExtension;
        }
        BrowserApi.createNewTab((RateUrls as any)[deviceType]);
    }
}
