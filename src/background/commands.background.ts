import { BrowserApi } from '../browser/browserApi';

import MainBackground from './main.background';

import { Analytics } from 'jslib/misc';

import { LockService } from 'jslib/abstractions/lock.service';
import { PasswordGenerationService } from 'jslib/abstractions/passwordGeneration.service';
import { PlatformUtilsService } from 'jslib/abstractions/platformUtils.service';

const openPopup = (isFirefox: boolean): () => void => {
    let resolver
    const openDeferred = new Promise((resolve) => {
        if (isFirefox) {
            chrome.browserAction.openPopup()
            const intervalId = setInterval(() => {
                if (chrome.extension.getViews({ type: 'popup' }).length) {
                    resolve()
                    clearInterval(intervalId)
                }
            }, 10)
        } else {
            chrome.browserAction.openPopup(resolve)
        }
    })
    const closeDeferred = new Promise((resolve) => {
        resolver = resolve
    })

    Promise.all([openDeferred, closeDeferred]).then(() => {
        chrome.extension.getViews({ type: 'popup' }).forEach((view: Window) => {
            view.close()
        })
    })

    return resolver
}

export default class CommandsBackground {
    private commands: any;
    private isFirefox: boolean;
    private isSafari: boolean;
    private isEdge: boolean;
    private isVivaldi: boolean;

    constructor(private main: MainBackground, private passwordGenerationService: PasswordGenerationService,
        private platformUtilsService: PlatformUtilsService, private analytics: Analytics,
        private lockService: LockService) {
        this.isFirefox = this.platformUtilsService.isFirefox();
        this.isSafari = this.platformUtilsService.isSafari();
        this.isEdge = this.platformUtilsService.isEdge();
        this.isVivaldi = this.platformUtilsService.isVivaldi();
        this.commands = this.isSafari ? safari.application : chrome.commands;
    }

    async init() {
        if (!this.commands && !this.isEdge) {
            return;
        }

        if (this.isSafari || this.isEdge || this.isVivaldi) {
            BrowserApi.messageListener(async (msg: any, sender: any, sendResponse: any) => {
                if (msg.command === 'keyboardShortcutTriggered' && msg.shortcut) {
                    await this.processCommand(msg.shortcut, sender);
                }
            });
        } else {
            this.commands.onCommand.addListener(async (command: any) => {
                await this.processCommand(command);
            });
        }
    }

    private async processCommand(command: string, sender?: any) {
        switch (command) {
            case 'generate_password':
                await this.generatePasswordToClipboard(openPopup(this.isFirefox));
                break;
            case 'autofill_login':
                await this.autoFillLogin(sender ? sender.tab : null, openPopup(this.isFirefox));
                break;
            case 'open_popup':
                await this.openPopup();
                break;
            default:
                break;
        }
    }

    private async generatePasswordToClipboard(closePopup: () => void) {
        if (this.isSafari || this.isEdge) {
            // Safari does not support access to clipboard from background
            return;
        }

        if (await this.lockService.isLocked()) {
            return;
        }

        closePopup()

        const options = await this.passwordGenerationService.getOptions();
        const password = await this.passwordGenerationService.generatePassword(options);
        this.platformUtilsService.copyToClipboard(password, { window: window });
        this.passwordGenerationService.addHistory(password);

        this.analytics.ga('send', {
            hitType: 'event',
            eventAction: 'Generated Password From Command',
        });
    }

    private async autoFillLogin(tab: any, closePopup: () => void) {
        if (await this.lockService.isLocked()) {
            return;
        }

        if (!tab) {
            tab = await BrowserApi.getTabFromCurrentWindowId();
        }

        if (tab == null) {
            return;
        }

        closePopup()
        await this.main.collectPageDetailsForContentScript(tab, 'autofill_cmd');

        this.analytics.ga('send', {
            hitType: 'event',
            eventAction: 'Autofilled From Command',
        });
    }

    private async openPopup() {
        // Chrome APIs cannot open popup
        if (!this.isSafari) {
            return;
        }

        this.main.openPopup();
        this.analytics.ga('send', {
            hitType: 'event',
            eventAction: 'Opened Popup From Command',
        });
    }
}
