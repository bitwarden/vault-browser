import {
    HandlerCommandKey,
    IFirefoxProxyRequest,
    IFirefoxProxyResponse,
    SeparatorKey,
} from './privateBrowsingProxyCommon';

class FirefoxProxyClient {
    static create(dispatchFunction: (message: IFirefoxProxyRequest) => Promise<IFirefoxProxyResponse>) {
        return FirefoxProxyClient.createInternal('', dispatchFunction);
    }

    private static createInternal(path: string,
                                  dispatchFunction: (message: IFirefoxProxyRequest)
                                  => Promise<IFirefoxProxyResponse>): ProxyHandler<FirefoxProxyClient> {
        return new Proxy(() => {
            throw new Error('Should never be called');
        }, new FirefoxProxyClient(path, dispatchFunction));
    }

    private constructor(private path: string,
                        private dispatchFunction: (message: IFirefoxProxyRequest) => Promise<IFirefoxProxyResponse>) {
    }

    get(_: object, property: string) {
        if (property === 'isPrivateBrowsingProxy') {
            return true;
        }
        if (property === 'getRawValue') {
            return this.dispatchMessage('get', this.path);
        }
        const nextPath = this.path === '' ? property : this.path + SeparatorKey + property;
        console.log(nextPath);
        return FirefoxProxyClient.createInternal(nextPath, this.dispatchFunction);
    }

    async apply(_1: object, _2: object, argumentsList: any[]): Promise<any> {
        return await this.dispatchMessage('func', this.path, argumentsList);
    }

    private getTypesForValue(value?: any): any {
        if (!value) {
            return;
        }

        if (Array.isArray(value)) {
            return value.map(val => this.getTypesForValue(val));
        }

        if (value.constructor) {
            return value.constructor.name;
        }
    }

    private async dispatchMessage(type: string, path: string, value?: any[]): Promise<any> {
        const message: IFirefoxProxyRequest = {
            type: type,
            key: path,
            value: value,
            valueTypes: this.getTypesForValue(value),
            command: HandlerCommandKey,
        };

        const response = await this.dispatchFunction(message);

        if (response.type === 'const') {
            return response.value;
        }

        if (response.type === 'err') {
            throw new Error(response.value);
        }

        throw new Error('Can only proxy constant values');
    }
}

export const firefoxClient = (dispatchFunction: (message: IFirefoxProxyRequest)
    => Promise<IFirefoxProxyResponse>): any => {
    return {
        bitwardenMain: FirefoxProxyClient.create(dispatchFunction),
    };
};
