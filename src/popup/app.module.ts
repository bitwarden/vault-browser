import 'core-js';
import 'zone.js/dist/zone';

import { DragDropModule } from '@angular/cdk/drag-drop';
import { ToasterModule } from 'angular2-toaster';
import { Angulartics2Module } from 'angulartics2';
import { Angulartics2GoogleAnalytics } from 'angulartics2/ga';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

import { AppRoutingModule } from './app-routing.module';
import { ServicesModule } from './services/services.module';

import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { EnvironmentComponent } from './accounts/environment.component';
import { HintComponent } from './accounts/hint.component';
import { HomeComponent } from './accounts/home.component';
import { LockComponent } from './accounts/lock.component';
import { LoginComponent } from './accounts/login.component';
import { RegisterComponent } from './accounts/register.component';
import { TwoFactorOptionsComponent } from './accounts/two-factor-options.component';
import { TwoFactorComponent } from './accounts/two-factor.component';
import { AppComponent } from './app.component';
import { PasswordGeneratorHistoryComponent } from './generator/password-generator-history.component';
import { PasswordGeneratorComponent } from './generator/password-generator.component';
import { PrivateModeComponent } from './private-mode.component';
import { ExportComponent } from './settings/export.component';
import { FolderAddEditComponent } from './settings/folder-add-edit.component';
import { FoldersComponent } from './settings/folders.component';
import { OptionsComponent } from './settings/options.component';
import { PremiumComponent } from './settings/premium.component';
import { SettingsComponent } from './settings/settings.component';
import { SyncComponent } from './settings/sync.component';
import { TabsComponent } from './tabs.component';
import { AddEditComponent } from './vault/add-edit.component';
import { AttachmentsComponent } from './vault/attachments.component';
import { CiphersComponent } from './vault/ciphers.component';
import { CollectionsComponent } from './vault/collections.component';
import { CurrentTabComponent } from './vault/current-tab.component';
import { GroupingsComponent } from './vault/groupings.component';
import { PasswordHistoryComponent } from './vault/password-history.component';
import { ShareComponent } from './vault/share.component';
import { ViewComponent } from './vault/view.component';

import { A11yTitleDirective } from 'jslib/angular/directives/a11y-title.directive';
import { ApiActionDirective } from 'jslib/angular/directives/api-action.directive';
import { AutofocusDirective } from 'jslib/angular/directives/autofocus.directive';
import { BlurClickDirective } from 'jslib/angular/directives/blur-click.directive';
import { BoxRowDirective } from 'jslib/angular/directives/box-row.directive';
import { FallbackSrcDirective } from 'jslib/angular/directives/fallback-src.directive';
import { InputVerbatimDirective } from 'jslib/angular/directives/input-verbatim.directive';
import { SelectCopyDirective } from 'jslib/angular/directives/select-copy.directive';
import { StopClickDirective } from 'jslib/angular/directives/stop-click.directive';
import { StopPropDirective } from 'jslib/angular/directives/stop-prop.directive';
import { TrueFalseValueDirective } from 'jslib/angular/directives/true-false-value.directive';

import { ColorPasswordPipe } from 'jslib/angular/pipes/color-password.pipe';
import { AsyncI18nPipe as I18nPipe } from './pipes/async-i18n.pipe';
import { SearchCiphersPipe } from 'jslib/angular/pipes/search-ciphers.pipe';

import { ActionButtonsComponent } from './components/action-buttons.component';
import { CiphersListComponent } from './components/ciphers-list.component';
import { PopOutComponent } from './components/pop-out.component';

import { CalloutComponent } from 'jslib/angular/components/callout.component';
import { IconComponent } from 'jslib/angular/components/icon.component';

import {
    CurrencyPipe,
    registerLocaleData,
} from '@angular/common';
import localeBg from '@angular/common/locales/bg';
import localeCa from '@angular/common/locales/ca';
import localeCs from '@angular/common/locales/cs';
import localeDa from '@angular/common/locales/da';
import localeDe from '@angular/common/locales/de';
import localeEl from '@angular/common/locales/el';
import localeEnGb from '@angular/common/locales/en-GB';
import localeEs from '@angular/common/locales/es';
import localeEt from '@angular/common/locales/et';
import localeFa from '@angular/common/locales/fa';
import localeFi from '@angular/common/locales/fi';
import localeFr from '@angular/common/locales/fr';
import localeHe from '@angular/common/locales/he';
import localeHr from '@angular/common/locales/hr';
import localeHu from '@angular/common/locales/hu';
import localeId from '@angular/common/locales/id';
import localeIt from '@angular/common/locales/it';
import localeJa from '@angular/common/locales/ja';
import localeKo from '@angular/common/locales/ko';
import localeNb from '@angular/common/locales/nb';
import localeNl from '@angular/common/locales/nl';
import localePl from '@angular/common/locales/pl';
import localePtBr from '@angular/common/locales/pt';
import localePtPt from '@angular/common/locales/pt-PT';
import localeRo from '@angular/common/locales/ro';
import localeRu from '@angular/common/locales/ru';
import localeSk from '@angular/common/locales/sk';
import localeSv from '@angular/common/locales/sv';
import localeTh from '@angular/common/locales/th';
import localeTr from '@angular/common/locales/tr';
import localeUk from '@angular/common/locales/uk';
import localeVi from '@angular/common/locales/vi';
import localeZhCn from '@angular/common/locales/zh-Hans';
import localeZhTw from '@angular/common/locales/zh-Hant';

registerLocaleData(localeBg, 'bg');
registerLocaleData(localeCa, 'ca');
registerLocaleData(localeCs, 'cs');
registerLocaleData(localeDa, 'da');
registerLocaleData(localeDe, 'de');
registerLocaleData(localeEl, 'el');
registerLocaleData(localeEnGb, 'en-GB');
registerLocaleData(localeEs, 'es');
registerLocaleData(localeEt, 'et');
registerLocaleData(localeFa, 'fa');
registerLocaleData(localeFi, 'fi');
registerLocaleData(localeFr, 'fr');
registerLocaleData(localeHe, 'he');
registerLocaleData(localeHr, 'hr');
registerLocaleData(localeHu, 'hu');
registerLocaleData(localeId, 'id');
registerLocaleData(localeIt, 'it');
registerLocaleData(localeJa, 'ja');
registerLocaleData(localeKo, 'ko');
registerLocaleData(localeNb, 'nb');
registerLocaleData(localeNl, 'nl');
registerLocaleData(localePl, 'pl');
registerLocaleData(localePtBr, 'pt-BR');
registerLocaleData(localePtPt, 'pt-PT');
registerLocaleData(localeRo, 'ro');
registerLocaleData(localeRu, 'ru');
registerLocaleData(localeSk, 'sk');
registerLocaleData(localeSv, 'sv');
registerLocaleData(localeTh, 'th');
registerLocaleData(localeTr, 'tr');
registerLocaleData(localeUk, 'uk');
registerLocaleData(localeVi, 'vi');
registerLocaleData(localeZhCn, 'zh-CN');
registerLocaleData(localeZhTw, 'zh-TW');

@NgModule({
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        FormsModule,
        AppRoutingModule,
        ServicesModule,
        Angulartics2Module.forRoot([Angulartics2GoogleAnalytics], {
            pageTracking: {
                clearQueryParams: true,
            },
        }),
        ToasterModule.forRoot(),
        InfiniteScrollModule,
        DragDropModule,
    ],
    declarations: [
        A11yTitleDirective,
        ActionButtonsComponent,
        AddEditComponent,
        ApiActionDirective,
        AppComponent,
        AttachmentsComponent,
        AutofocusDirective,
        BlurClickDirective,
        BoxRowDirective,
        CalloutComponent,
        CiphersComponent,
        CiphersListComponent,
        CollectionsComponent,
        ColorPasswordPipe,
        CurrentTabComponent,
        EnvironmentComponent,
        ExportComponent,
        FallbackSrcDirective,
        FolderAddEditComponent,
        FoldersComponent,
        GroupingsComponent,
        HomeComponent,
        HintComponent,
        I18nPipe,
        IconComponent,
        InputVerbatimDirective,
        LockComponent,
        LoginComponent,
        OptionsComponent,
        PasswordGeneratorComponent,
        PasswordGeneratorHistoryComponent,
        PasswordHistoryComponent,
        PopOutComponent,
        PremiumComponent,
        PrivateModeComponent,
        RegisterComponent,
        SearchCiphersPipe,
        SelectCopyDirective,
        SettingsComponent,
        ShareComponent,
        StopClickDirective,
        StopPropDirective,
        SyncComponent,
        TabsComponent,
        TrueFalseValueDirective,
        TwoFactorOptionsComponent,
        TwoFactorComponent,
        ViewComponent,
    ],
    entryComponents: [],
    providers: [
        CurrencyPipe,
    ],
    bootstrap: [AppComponent],
})
export class AppModule { }
