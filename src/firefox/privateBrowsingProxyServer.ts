import {
    HandlerCommandKey,
    IFirefoxProxyRequest,
    IFirefoxProxyResponse,
    SeparatorKey,
} from './privateBrowsingProxyCommon';
import { TokenRequest } from 'jslib/models/request';

interface IValueTypeMappings {
    [key: string]: any
}

const VALUE_TYPE_MAPPINGS: IValueTypeMappings = {
    'TokenRequest': TokenRequest
};

const CONST_TYPES = ['string', 'number', 'boolean', 'undefined'];

interface IParentChildObject {
    parent: any;
    child: any;
}

let exclude: string[] = [];
const getPropertiesList = (obj: any): string[] => {
    console.log('Listing properties');
    const knownProperties = new Set<string>();
    let currentObj: any = obj;
    while (currentObj) {
        Object.getOwnPropertyNames(currentObj)
            .map((item: any) => item.toString())
            .filter((item: string) => !exclude.includes(item))
            .map((item: string) => knownProperties.add(item));
        currentObj = Object.getPrototypeOf(currentObj);
    }
    console.log('Listing properties done');
    return [...knownProperties.keys()];
};
exclude = getPropertiesList({});

export class FirefoxProxyReceiver {
    constructor(private rootObject: any) {
        this.handleMessage = this.handleMessage.bind(this);
    }

    handleMessage(request: IFirefoxProxyRequest): undefined | Promise<IFirefoxProxyResponse> {
        if (request.command === HandlerCommandKey) {
            return (async () => await this.receiveCallOverMessageBus(request))();
        }
    }

    private getRequestedObject(path: string[]): any {
        if (path.length === 0 || path[0] === '') {
            return this.rootObject;
        }

        return path.reduce((acc: any, curr: string) => acc[curr], this.rootObject);
    }

    private getParentAndChildObject(path: string): IParentChildObject {
        const setSpl = path.split(SeparatorKey);
        const parent = this.getRequestedObject(setSpl.slice(0, setSpl.length - 1));
        const childKey = setSpl[setSpl.length - 1];
        return {
            parent: parent,
            child: parent[childKey],
        };
    }

    private isConstantType(obj: any): boolean {
        const objType = typeof obj;
        if (CONST_TYPES.includes(objType) || obj === null) {
            return true;
        }
        if (Array.isArray(obj)) {
            return obj.every(this.isConstantType);
        }
        if (objType === 'object') {
            try {
                JSON.stringify(obj);
                return true;
            } catch (e) {
                return false;
            }
            // return getPropertiesList(obj)
            //     .every((prop: any) => this.isConstantType(obj[prop]));
        }
        return false;
    }

    private getResponseMessage(obj: any): IFirefoxProxyResponse {
        if (this.isConstantType(obj)) {
            return {
                type: 'const',
                value: obj,
            };
        } else if (typeof(obj) === 'function') {
            return {
                type: 'func',
            };
        } else {
            return {
                type: 'obj',
            };
        }
    }

    private convertValuesToTypes(values?: any, valueTypes?: any): any {
        if (!values) {
            return;
        }

        if (Array.isArray(values)) {
            return values.map((val, index) => this.convertValuesToTypes(val, valueTypes[index]));
        }

        if (valueTypes && VALUE_TYPE_MAPPINGS[valueTypes]) {
            console.log('Setting prototype');
            return Object.assign(new VALUE_TYPE_MAPPINGS[valueTypes](), values);
        }
        return values;
    }

    private async receiveCallOverMessageBus(message: IFirefoxProxyRequest): Promise<IFirefoxProxyResponse> {
        try {
            const { parent, child } = this.getParentAndChildObject(message.key);
            let result: any;
            if (message.type === 'func') {
                message.value = this.convertValuesToTypes(message.value, message.valueTypes);
                result = await child.apply(parent, message.value);
            } else {
                result = child;
            }
            return this.getResponseMessage(result);
        } catch (e) {
            return {
                type: 'err',
                value: e.message,
            };
        }
    }
}
