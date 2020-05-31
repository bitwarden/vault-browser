export const SeparatorKey: string = '.';
export const HandlerCommandKey: string = 'firefoxBgWindowProxy';

export interface IFirefoxProxyRequest {
    type: string;
    key: string;
    command: string;
    value?: any;
    valueTypes?: any;
}

export interface IFirefoxProxyResponse {
    type: string;
    value?: any;
}
