import { ConstantsService } from 'jslib/services/constants.service';

import {
    StorageService,
    VaultTimeoutService,
} from 'jslib/abstractions';
import { NotificationsService } from 'jslib/abstractions/notifications.service';

const IdleInterval = 60 * 5; // 5 minutes

export default class IdleBackground {
    private idle: any;
    private idleTimer: number = null;
    private idleState = 'active';

    constructor(private vaultTimeoutService: VaultTimeoutService, private storageService: StorageService,
        private notificationsService: NotificationsService) {
        this.idle = chrome.idle || (browser != null ? browser.idle : null);
    }

    async init() {
        if (!this.idle) {
            return;
        }

        const idleHandler = (newState: string) => {
            if (newState === 'active') {
                this.notificationsService.reconnectFromActivity();
            } else {
                this.notificationsService.disconnectFromInactivity();
            }
        };
        if (this.idle.onStateChanged && this.idle.setDetectionInterval) {
            this.idle.setDetectionInterval(IdleInterval);
            this.idle.onStateChanged.addListener(idleHandler);
        } else {
            this.pollIdle(idleHandler);
        }

        if (this.idle.onStateChanged) {
            this.idle.onStateChanged.addListener(async (newState: string) => {
                if (newState === 'locked') { // If the screen is locked or the screensaver activates
                    const options = await this.getVaultTimeoutOptions();
                    if (options[0] === -2) { // On System Lock vault timeout option
                        options[1] === 'lock' ? this.vaultTimeoutService.lock(true) : this.vaultTimeoutService.logOut();
                    }
                }
            });
        }
    }

    private pollIdle(handler: (newState: string) => void) {
        if (this.idleTimer != null) {
            window.clearTimeout(this.idleTimer);
            this.idleTimer = null;
        }
        this.idle.queryState(IdleInterval, (state: string) => {
            if (state !== this.idleState) {
                this.idleState = state;
                handler(state);
            }
            this.idleTimer = window.setTimeout(() => this.pollIdle(handler), 5000);
        });
    }

    private async getVaultTimeoutOptions(): Promise<[number, string]> {
        const timeout = await this.storageService.get<number>(ConstantsService.vaultTimeoutKey);
        const action = await this.storageService.get<string>(ConstantsService.vaultTimeoutActionKey);
        return [timeout, action];
    }
}
