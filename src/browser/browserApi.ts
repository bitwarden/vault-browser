import { firefoxClient } from '../firefox/privateBrowsingProxyClient';
import { SafariApp } from './safariApp';

import { Utils } from 'jslib/misc/utils';

export class BrowserApi {
    static isWebExtensionsApi: boolean = (typeof browser !== 'undefined');
    static isSafariApi: boolean = (window as any).safariAppExtension === true;
    static isChromeApi: boolean = !BrowserApi.isSafariApi && (typeof chrome !== 'undefined');
    static isFirefox: boolean = navigator.userAgent.indexOf('Firefox/') !== -1;
    static isFirefoxOnAndroid: boolean = BrowserApi.isFirefox &&
        navigator.userAgent.indexOf('Android') !== -1;
    static isEdge18: boolean = navigator.userAgent.indexOf(' Edge/18.') !== -1;

    static async getTabFromCurrentWindowId(): Promise<any> {
        if (BrowserApi.isChromeApi) {
            return await BrowserApi.tabsQueryFirst({
                active: true,
                windowId: chrome.windows.WINDOW_ID_CURRENT,
            });
        } else if (BrowserApi.isSafariApi) {
            return await BrowserApi.getTabFromCurrentWindow();
        }
    }

    static async getTabFromCurrentWindow(): Promise<any> {
        return await BrowserApi.tabsQueryFirst({
            active: true,
            currentWindow: true,
        });
    }

    static async getActiveTabs(): Promise<any[]> {
        return await BrowserApi.tabsQuery({
            active: true,
        });
    }

    static async tabsQuery(options: any): Promise<any[]> {
        if (BrowserApi.isChromeApi) {
            return new Promise((resolve) => {
                chrome.tabs.query(options, (tabs: any[]) => {
                    resolve(tabs);
                });
            });
        } else if (BrowserApi.isSafariApi) {
            const tabs = await SafariApp.sendMessageToApp('tabs_query', JSON.stringify(options));
            return tabs != null ? JSON.parse(tabs) : null;
        }
    }

    static async tabsQueryFirst(options: any): Promise<any> {
        const tabs = await BrowserApi.tabsQuery(options);
        if (tabs.length > 0) {
            return tabs[0];
        }

        return null;
    }

    static tabSendMessageData(tab: any, command: string, data: any = null): Promise<any[]> {
        const obj: any = {
            command: command,
        };

        if (data != null) {
            obj.data = data;
        }

        return BrowserApi.tabSendMessage(tab, obj);
    }

    static async tabSendMessage(tab: any, obj: any, options: any = null): Promise<any> {
        if (!tab || !tab.id) {
            return;
        }

        if (BrowserApi.isChromeApi) {
            return new Promise((resolve) => {
                chrome.tabs.sendMessage(tab.id, obj, options, () => {
                    if (chrome.runtime.lastError) {
                        // Some error happened
                    }
                    resolve();
                });
            });
        } else if (BrowserApi.isSafariApi) {
            if (options != null && options.frameId != null && obj.bitwardenFrameId == null) {
                obj.bitwardenFrameId = options.frameId;
            }
            await SafariApp.sendMessageToApp('tabs_message', JSON.stringify({
                tab: tab,
                obj: JSON.stringify(obj),
                options: options,
            }), true);
        }
    }

    static getBackgroundPage(): any {
        if (chrome.extension.getBackgroundPage() === null && BrowserApi.isFirefox) {
            return firefoxClient(browser.runtime.sendMessage);
        } else if (BrowserApi.isChromeApi) {
            return chrome.extension.getBackgroundPage();
        } else if (BrowserApi.isSafariApi) {
            return window;
        } else {
            return null;
        }
    }

    static getApplicationVersion(): string {
        if (BrowserApi.isChromeApi) {
            return chrome.runtime.getManifest().version;
        } else if (BrowserApi.isSafariApi) {
            return (window as any).bitwardenApplicationVersion;
        } else {
            return null;
        }
    }

    static async isPopupOpen(): Promise<boolean> {
        if (BrowserApi.isChromeApi) {
            return Promise.resolve(chrome.extension.getViews({ type: 'popup' }).length > 0);
        } else if (BrowserApi.isSafariApi) {
            const open = await SafariApp.sendMessageToApp('isPopoverOpen');
            return open === 'true';
        } else {
            return Promise.resolve(false);
        }
    }

    static createNewTab(url: string, extensionPage: boolean = false) {
        if (BrowserApi.isChromeApi) {
            chrome.tabs.create({ url: url });
        } else if (BrowserApi.isSafariApi) {
            SafariApp.sendMessageToApp('createNewTab', url, true);
        }
    }

    static messageListener(name: string, callback: (message: any, sender: any, response: any) => void) {
        if (BrowserApi.isChromeApi) {
            chrome.runtime.onMessage.addListener((msg: any, sender: any, response: any) => {
                callback(msg, sender, response);
            });
        } else if (BrowserApi.isSafariApi) {
            SafariApp.addMessageListener(name, (message: any, sender: any, response: any) => {
                if (message.bitwardenFrameId != null) {
                    if (sender != null && typeof (sender) === 'object' && sender.frameId == null) {
                        sender.frameId = message.bitwardenFrameId;
                    }
                }
                callback(message, sender, response);
            });
        }
    }

    static closePopup(win: Window) {
        if (BrowserApi.isWebExtensionsApi && BrowserApi.isFirefoxOnAndroid) {
            // Reactivating the active tab dismisses the popup tab. The promise final
            // condition is only called if the popup wasn't already dismissed (future proofing).
            // ref: https://bugzilla.mozilla.org/show_bug.cgi?id=1433604
            browser.tabs.update({ active: true }).finally(win.close);
        } else if (BrowserApi.isWebExtensionsApi || BrowserApi.isChromeApi) {
            win.close();
        } else if (BrowserApi.isSafariApi) {
            SafariApp.sendMessageToApp('hidePopover');
        }
    }

    static downloadFile(win: Window, blobData: any, blobOptions: any, fileName: string) {
        if (BrowserApi.isSafariApi) {
            const type = blobOptions != null ? blobOptions.type : null;
            let data: string = null;
            if (type === 'text/plain' && typeof (blobData) === 'string') {
                data = blobData;
            } else {
                data = Utils.fromBufferToB64(blobData);
            }
            SafariApp.sendMessageToApp('downloadFile', JSON.stringify({
                blobData: data,
                blobOptions: blobOptions,
                fileName: fileName,
            }), true);
        } else {
            const blob = new Blob([blobData], blobOptions);
            if (navigator.msSaveOrOpenBlob) {
                navigator.msSaveBlob(blob, fileName);
            } else {
                const a = win.document.createElement('a');
                a.href = win.URL.createObjectURL(blob);
                a.download = fileName;
                win.document.body.appendChild(a);
                a.click();
                win.document.body.removeChild(a);
            }
        }
    }

    static gaFilter() {
        return process.env.ENV !== 'production';
    }

    static getUILanguage(win: Window) {
        if (BrowserApi.isSafariApi) {
            return win.navigator.language;
        } else {
            return chrome.i18n.getUILanguage();
        }
    }

    static reloadExtension(win: Window) {
        if (win != null) {
            return win.location.reload(true);
        } else if (BrowserApi.isSafariApi) {
            SafariApp.sendMessageToApp('reloadExtension');
        } else if (!BrowserApi.isSafariApi) {
            return chrome.runtime.reload();
        }
    }
}
