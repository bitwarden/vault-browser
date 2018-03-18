import * as template from './icon.component.html';

import { BrowserApi } from '../../../browser/browserApi';

import { CipherType } from 'jslib/enums/cipherType';

import { EnvironmentService } from 'jslib/abstractions/environment.service';

export class IconController implements ng.IController {
    cipher: any;
    icon: string;
    image: string;
    fallbackImage: string;
    imageEnabled: boolean;

    private iconsUrl: string;
    private fallbackUrl: string;

    constructor(private stateService: any, private environmentService: EnvironmentService) {
        this.imageEnabled = stateService.getState('faviconEnabled');

        this.iconsUrl = environmentService.iconsUrl;
        if (!this.iconsUrl) {
            if (environmentService.baseUrl) {
                this.iconsUrl = environmentService.baseUrl + '/icons';
            } else {
                this.iconsUrl = 'https://icons.bitwarden.com';
            }
        }
        
        if (!this.fallbackUrl) {
            this.fallbackUrl = 'https://icons.karahanbuhan';   
        }
    }

    $onChanges() {
        switch (this.cipher.type) {
            case CipherType.Login:
                this.icon = 'fa-globe';
                this.setLoginIcon();
                break;
            case CipherType.SecureNote:
                this.icon = 'fa-sticky-note-o';
                break;
            case CipherType.Card:
                this.icon = 'fa-credit-card';
                break;
            case CipherType.Identity:
                this.icon = 'fa-id-card-o';
                break;
            default:
                break;
        }
    }

    private setLoginIcon() {
        if (this.cipher.login.uri) {
            let hostnameUri = this.cipher.login.uri;
            let isWebsite = false;

            if (hostnameUri.indexOf('androidapp://') === 0) {
                this.icon = 'fa-android';
                this.image = null;
            } else if (hostnameUri.indexOf('iosapp://') === 0) {
                this.icon = 'fa-apple';
                this.image = null;
            } else if (this.imageEnabled && hostnameUri.indexOf('://') === -1 && hostnameUri.indexOf('.') > -1) {
                hostnameUri = 'http://' + hostnameUri;
                isWebsite = true;
            } else if (this.imageEnabled) {
                isWebsite = hostnameUri.indexOf('http') === 0 && hostnameUri.indexOf('.') > -1;
            }

            if (this.imageEnabled && isWebsite) {
                try {
                    const url = new URL(hostnameUri);
                    this.image = this.iconsUrl + '/' + url.hostname + '/icon.png';
                    this.fallbackImage = this.fallbackUrl + '/' + url.hostname + '/icon.png';
                } catch (e) { }
            }
        } else {
            this.image = null;
        }
    }
}

IconController.$inject = ['stateService', 'environmentService'];

export const IconComponent = {
    bindings: {
        cipher: '<',
    },
    controller: IconController,
    template: template,
};
