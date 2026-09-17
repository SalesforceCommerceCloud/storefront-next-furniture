/**
 * Copyright 2026 Salesforce, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { ResourceLanguage } from 'i18next';
import type { DeepPartial } from '@/locales/types';
import type enUS from '@/locales/en-US/';
import translations from '@/locales/en-GB/translations.json';
import extensionTranslations from '@/extensions/locales/en-GB/';

const allTranslations = {
    ...translations,
    ...extensionTranslations,
};

// Brand namespaces absent from the base tree are widened to string-indexed records so i18next's
// key-union type stays within TypeScript's instantiation limits for large locales. Only the t() key
// type is affected — every other namespace keeps full key type-safety. Type-only, no runtime code.
const resources = allTranslations as Omit<typeof allTranslations, 'furnitureAboutUs' | 'swatches'> & {
    furnitureAboutUs: Record<string, unknown>;
    swatches: Record<string, unknown>;
};

export default resources satisfies ResourceLanguage satisfies DeepPartial<typeof enUS>;
