import { ConstantsService } from 'jslib/services/constants.service';

import {
    LockService,
    StorageService,
} from 'jslib/abstractions';
import { NotificationsService } from 'jslib/abstractions/notifications.service';

const IdleInterval = 60 * 5; // 5 minutes

export default class IdleBackground {
    private idle: any;
    private idleTimer: number = null;
    private idleState = 'active';

    constructor(private lockService: LockService, private storageService: StorageService,
        private notificationsService: NotificationsService) {
        this.idle = chrome.idle || (browser != null ? browser.idle : null);

        // Set default state
        this.storageService.save(ConstantsService.idleStateKey, this.idleState);
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
                if (newState === 'locked') {
                    const lockOption = await this.storageService.get<number>(ConstantsService.lockOptionKey);
                    const lockOnSystemLock = await this.storageService.get<boolean>(ConstantsService.lockOnSystemLockKey);
                    if (lockOption === -2 || lockOnSystemLock) {
                        this.lockService.lock(true);
                    }
                } else if (newState === 'idle') {
                    const lockAfterIdle = await this.storageService.get<boolean>(ConstantsService.lockAfterIdleKey);
                    if (lockAfterIdle) {
                        // Subtract the 5 minute time idle time interval from the last active time
                        const now = (new Date()).getTime() - 5 * 60 * 1000;

                        this.storageService.save(ConstantsService.lastActiveKey, now);
                    }
                }

                this.storageService.save(ConstantsService.idleStateKey, newState);
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
}
