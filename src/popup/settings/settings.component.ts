import { Angulartics2 } from 'angulartics2';
import swal from 'sweetalert';

import {
    Component,
    ElementRef,
    OnInit,
    ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { BrowserApi } from '../../browser/browserApi';

import { DeviceType } from 'jslib/enums/deviceType';

import { ConstantsService } from 'jslib/services/constants.service';

import { CryptoService } from 'jslib/abstractions/crypto.service';
import { EnvironmentService } from 'jslib/abstractions/environment.service';
import { I18nService } from 'jslib/abstractions/i18n.service';
import { LockService } from 'jslib/abstractions/lock.service';
import { MessagingService } from 'jslib/abstractions/messaging.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';
import { StorageService } from 'jslib/abstractions/storage.service';
import { UserService } from 'jslib/abstractions/user.service';

const RateUrls = {
    [DeviceType.ChromeExtension]:
        'https://chrome.google.com/webstore/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb/reviews',
    [DeviceType.FirefoxExtension]:
        'https://addons.mozilla.org/en-US/firefox/addon/bitwarden-password-manager/#reviews',
    [DeviceType.OperaExtension]:
        'https://addons.opera.com/en/extensions/details/bitwarden-free-password-manager/#feedback-container',
    [DeviceType.EdgeExtension]:
        'https://www.microsoft.com/store/p/bitwarden-free-password-manager/9p6kxl0svnnl',
    [DeviceType.VivaldiExtension]:
        'https://chrome.google.com/webstore/detail/bitwarden-free-password-m/nngceckbapebfimnlniiiahkandclblb/reviews',
    [DeviceType.SafariExtension]:
        'https://apps.apple.com/app/bitwarden/id1352778147',
};

@Component({
    selector: 'app-settings',
    templateUrl: 'settings.component.html',
})
export class SettingsComponent implements OnInit {
    @ViewChild('lockOptionsSelect', { read: ElementRef }) lockOptionsSelectRef: ElementRef;
    lockOptions: any[];
    lockOption: number = null;
    lockAfterIdle = false;
    lockOnSystemLock = false;
    pin: boolean = null;
    previousLockOption: number = null;

    constructor(private platformUtilsService: PlatformUtilsService, private i18nService: I18nService,
        private analytics: Angulartics2, private lockService: LockService,
        private storageService: StorageService, public messagingService: MessagingService,
        private router: Router, private environmentService: EnvironmentService,
        private cryptoService: CryptoService, private userService: UserService) {
    }

    async ngOnInit() {
        const showOnLocked = !this.platformUtilsService.isFirefox() && !this.platformUtilsService.isEdge()
            && !this.platformUtilsService.isSafari();

        this.lockOptions = [
            { name: this.i18nService.t('immediately'), value: 0 },
            { name: this.i18nService.t('oneMinute'), value: 1 },
            { name: this.i18nService.t('fiveMinutes'), value: 5 },
            { name: this.i18nService.t('fifteenMinutes'), value: 15 },
            { name: this.i18nService.t('thirtyMinutes'), value: 30 },
            { name: this.i18nService.t('oneHour'), value: 60 },
            { name: this.i18nService.t('fourHours'), value: 240 },
            // { name: i18nService.t('onIdle'), value: -4 },
            // { name: i18nService.t('onSleep'), value: -3 },
        ];

        if (showOnLocked) {
            this.lockOptions.push({ name: this.i18nService.t('onLocked'), value: -2 });
        }

        this.lockOptions.push({ name: this.i18nService.t('onRestart'), value: -1 });
        this.lockOptions.push({ name: this.i18nService.t('never'), value: null });

        let option = await this.storageService.get<number>(ConstantsService.lockOptionKey);
        if (option != null) {
            if (option === -2 && !showOnLocked) {
                option = -1;
            }
            this.lockOption = option;
        }
        this.previousLockOption = this.lockOption;

        this.lockAfterIdle = await this.storageService.get<boolean>(ConstantsService.lockAfterIdleKey);
        this.lockOnSystemLock = await this.storageService.get<boolean>(ConstantsService.lockOnSystemLockKey);

        const pinSet = await this.lockService.isPinLockSet();
        this.pin = pinSet[0] || pinSet[1];
    }

    async saveLockOption(newValue: number) {
        if (newValue == null) {
            const confirmed = await this.platformUtilsService.showDialog(
                this.i18nService.t('neverLockWarning'), null,
                this.i18nService.t('yes'), this.i18nService.t('cancel'), 'warning');
            if (!confirmed) {
                this.lockOptions.forEach((option: any, i) => {
                    if (option.value === this.lockOption) {
                        this.lockOptionsSelectRef.nativeElement.value = i + ': ' + this.lockOption;
                    }
                });
                return;
            }
        }
        this.previousLockOption = this.lockOption;
        this.lockOption = newValue;
        await this.lockService.setLockOption(this.lockOption != null ? this.lockOption : null);
        if (this.previousLockOption == null) {
            this.messagingService.send('bgReseedStorage');
        }
    }

    updateLockAfterIdle() {
        this.storageService.save(ConstantsService.lockAfterIdleKey, this.lockAfterIdle);
    }
    updateLockOnSystemLock() {
        this.storageService.save(ConstantsService.lockOnSystemLockKey, this.lockOnSystemLock);
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
            div.innerHTML = '<input type="text" class="swal-content__input" id="pin-val" autocomplete="off" ' +
                'autocapitalize="none" autocorrect="none" spellcheck="false" inputmode="verbatim">';
            (div.querySelector('#pin-val') as HTMLInputElement).placeholder = this.i18nService.t('pin');
            div.appendChild(label);

            const submitted = await swal({
                text: this.i18nService.t('setYourPinCode'),
                content: { element: div },
                buttons: [this.i18nService.t('cancel'), this.i18nService.t('submit')],
            });
            let pin: string = null;
            let masterPassOnRestart: boolean = null;
            if (submitted) {
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
                    this.lockService.pinProtectedKey = pinProtectedKey;
                } else {
                    await this.storageService.save(ConstantsService.pinProtectedKey, pinProtectedKey.encryptedString);
                }
            } else {
                this.pin = false;
            }
        }
        if (!this.pin) {
            await this.cryptoService.clearPinProtectedKey();
            await this.lockService.clear();
        }
    }

    async lock() {
        this.analytics.eventTrack.next({ action: 'Lock Now' });
        await this.lockService.lock(true);
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
        this.analytics.eventTrack.next({ action: 'Clicked Change Password' });
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('changeMasterPasswordConfirmation'), this.i18nService.t('changeMasterPassword'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/change-your-master-password/');
        }
    }

    async twoStep() {
        this.analytics.eventTrack.next({ action: 'Clicked Two-step Login' });
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('twoStepLoginConfirmation'), this.i18nService.t('twoStepLogin'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/setup-two-step-login/');
        }
    }

    async share() {
        this.analytics.eventTrack.next({ action: 'Clicked Share Vault' });
        const confirmed = await this.platformUtilsService.showDialog(
            this.i18nService.t('shareVaultConfirmation'), this.i18nService.t('shareVault'),
            this.i18nService.t('yes'), this.i18nService.t('cancel'));
        if (confirmed) {
            BrowserApi.createNewTab('https://help.bitwarden.com/article/what-is-an-organization/');
        }
    }

    async webVault() {
        this.analytics.eventTrack.next({ action: 'Clicked Web Vault' });
        let url = this.environmentService.getWebVaultUrl();
        if (url == null) {
            url = 'https://vault.bitwarden.com';
        }
        BrowserApi.createNewTab(url);
    }

    import() {
        this.analytics.eventTrack.next({ action: 'Clicked Import Items' });
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
        this.analytics.eventTrack.next({ action: 'Clicked Help and Feedback' });
        BrowserApi.createNewTab('https://help.bitwarden.com/');
    }

    about() {
        this.analytics.eventTrack.next({ action: 'Clicked About' });

        const year = (new Date()).getFullYear();
        const versionText = document.createTextNode(
            this.i18nService.t('version') + ': ' + BrowserApi.getApplicationVersion());
        const div = document.createElement('div');
        div.innerHTML = `<p class="text-center"><i class="fa fa-shield fa-3x" aria-hidden="true"></i></p>
            <p class="text-center"><b>Bitwarden</b><br>&copy; Bitwarden Inc. 2015-` + year + `</p>`;
        div.appendChild(versionText);

        swal({
            content: { element: div },
            buttons: [this.i18nService.t('close'), false],
        });
    }

    async fingerprint() {
        this.analytics.eventTrack.next({ action: 'Clicked Fingerprint' });

        const fingerprint = await this.cryptoService.getFingerprint(await this.userService.getUserId());
        const p = document.createElement('p');
        p.innerText = this.i18nService.t('yourAccountsFingerprint') + ':';
        const p2 = document.createElement('p');
        p2.innerText = fingerprint.join('-');
        const div = document.createElement('div');
        div.appendChild(p);
        div.appendChild(p2);

        const result = await swal({
            content: { element: div },
            buttons: [this.i18nService.t('close'), this.i18nService.t('learnMore')],
        });

        if (result) {
            this.platformUtilsService.launchUri('https://help.bitwarden.com/article/fingerprint-phrase/');
        }
    }

    rate() {
        this.analytics.eventTrack.next({ action: 'Rate Extension' });
        BrowserApi.createNewTab((RateUrls as any)[this.platformUtilsService.getDevice()]);
    }
}
