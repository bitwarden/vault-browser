import {
    Pipe,
    PipeTransform,
} from '@angular/core';

import { I18nService } from 'jslib/abstractions/i18n.service';

@Pipe({
    name: 'i18n',
})
export class AsyncI18nPipe implements PipeTransform {
    constructor(private i18nService: I18nService) { }

    transform(id: string, p1?: string, p2?: string, p3?: string): Promise<string> {
        const value = this.i18nService.t(id, p1, p2, p3) as string | Promise<string>;
        if (typeof value === 'string') {
            return Promise.resolve(value);
        }
        return value;
    }
}
