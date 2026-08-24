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
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useStoreLocatorForm } from '@/extensions/store-locator/hooks/use-store-locator-form';
import { useStoreLocator } from '@/extensions/store-locator/providers/store-locator';
import { createLogger } from '@/lib/logger';

const logger = createLogger();

export default function ShowroomSearchForm() {
    const { t } = useTranslation('showrooms');
    const config = useStoreLocator((state) => state.config);
    const setDeviceCoordinates = useStoreLocator((state) => state.setDeviceCoordinates);
    const setGeoError = useStoreLocator((state) => state.setGeoError);
    const { form, onSubmit } = useStoreLocatorForm();

    const onUseMyLocation = useCallback(() => {
        if (!window.navigator?.geolocation?.getCurrentPosition) return;
        setGeoError(false);
        window.navigator.geolocation.getCurrentPosition(
            ({ coords }) => setDeviceCoordinates({ latitude: coords.latitude, longitude: coords.longitude }),
            (error) => {
                logger.warn('Showroom geolocation error', { code: error.code, message: error.message });
                setGeoError(true);
            },
            { timeout: config.geoTimeout }
        );
    }, [config.geoTimeout, setDeviceCoordinates, setGeoError]);

    return (
        <Form {...form}>
            <form onSubmit={(event) => void form.handleSubmit(onSubmit)(event)} aria-label={t('search.formLabel')}>
                <div className="grid gap-3 sm:grid-cols-[11rem_1fr_auto]">
                    <FormField
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">{t('search.country')}</FormLabel>
                                <FormControl>
                                    <NativeSelect
                                        aria-label={t('search.country')}
                                        value={field.value}
                                        onChange={field.onChange}>
                                        <option value="" disabled>
                                            {t('search.selectCountry')}
                                        </option>
                                        {config.supportedCountries.map((country) => (
                                            <option key={country.countryCode} value={country.countryCode}>
                                                {country.countryName}
                                            </option>
                                        ))}
                                    </NativeSelect>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="sr-only">{t('search.postalCode')}</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        aria-label={t('search.postalCode')}
                                        placeholder={t('search.postalCodePlaceholder')}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit">{t('search.submit')}</Button>
                </div>
                <div className="my-4 flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {t('search.separator')}
                    </span>
                    <span className="h-px flex-1 bg-border" />
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={onUseMyLocation}>
                    {t('search.useLocation')}
                </Button>
            </form>
        </Form>
    );
}
