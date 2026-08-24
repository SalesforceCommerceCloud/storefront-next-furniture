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
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFetcher, useSearchParams } from 'react-router';
import { useConfig } from '@salesforce/storefront-next-runtime/config';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/typography';
import ListSkeleton from '@/extensions/store-locator/components/store-locator/list-skeleton';
import { useStoreLocatorList } from '@/extensions/store-locator/hooks/use-store-locator-list';
import ShowroomSearchForm from '@/components/showroom-locator/form';
import ShowroomResults from '@/components/showroom-locator/results';
import type { ShowroomAvailabilityResult } from '@/components/showroom-locator/types';

const ShowroomMap = lazy(() => import('@/components/showroom-locator/showroom-map'));

export default function ShowroomLocator({ gcpApiKey = '' }: { gcpApiKey?: string }) {
    const { t } = useTranslation('showrooms');
    const config = useConfig();
    const [searchParams] = useSearchParams();
    const productId = searchParams.get('productId')?.trim() ?? '';
    const availabilityFetcher = useFetcher<ShowroomAvailabilityResult>();
    const loadAvailabilityRef = useRef(availabilityFetcher.load);
    const requestedAvailabilityKeyRef = useRef('');
    loadAvailabilityRef.current = availabilityFetcher.load;
    const [page, setPage] = useState(1);
    const [selectedShowroomId, setSelectedShowroomId] = useState<string | null>(null);
    const { config: locatorConfig, geoError, hasError, hasSearched, isLoading, stores } = useStoreLocatorList();
    const showrooms = stores.slice(0, page * 10);
    const inventoryIds = showrooms.flatMap((showroom) => (showroom.inventoryId ? [showroom.inventoryId] : []));
    const inventoryKey = [...new Set(inventoryIds)].sort().join(',');
    const googleMapsApiKey = config.features.googleCloudAPI.apiKey || gcpApiKey;
    const hasMappableShowrooms = showrooms.some(
        (showroom) => typeof showroom.latitude === 'number' && typeof showroom.longitude === 'number'
    );

    useEffect(() => {
        if (!productId || !inventoryKey) {
            requestedAvailabilityKeyRef.current = '';
            return;
        }
        const availabilityKey = `${productId}:${inventoryKey}`;
        if (requestedAvailabilityKeyRef.current === availabilityKey) return;
        requestedAvailabilityKeyRef.current = availabilityKey;
        const params = new URLSearchParams({ productId, inventoryIds: inventoryKey });
        void loadAvailabilityRef.current(`/resource/showroom-availability?${params.toString()}`);
    }, [inventoryKey, productId]);

    useEffect(() => {
        setPage(1);
        setSelectedShowroomId(stores[0]?.id ?? null);
    }, [stores]);

    const message = geoError
        ? t('messages.geolocationError')
        : hasError
          ? t('messages.fetchError')
          : hasSearched && !isLoading && stores.length === 0
            ? t('messages.noResults')
            : null;

    return (
        <div className="grid gap-10 lg:grid-cols-[minmax(20rem,0.8fr)_minmax(28rem,1.2fr)]">
            <div>
                <Typography as="h2" variant="h3" id="showroom-search-heading">
                    {t('search.title')}
                </Typography>
                <p className="mt-2 text-muted-foreground">{t('search.description')}</p>
                <div className="mt-6">
                    <ShowroomSearchForm />
                </div>
                <div className="mt-8">
                    {isLoading && (
                        <div aria-live="polite">
                            <ListSkeleton statusMessage={t('messages.loading')} />
                        </div>
                    )}
                    {message && (
                        <p role="status" className="py-8 text-center text-muted-foreground">
                            {message}
                        </p>
                    )}
                    {!isLoading && showrooms.length > 0 && (
                        <>
                            <ShowroomResults
                                availability={availabilityFetcher.data?.availability}
                                distanceUnit={locatorConfig.radiusUnit}
                                mapEnabled={Boolean(googleMapsApiKey)}
                                productAware={Boolean(productId)}
                                selectedShowroomId={selectedShowroomId}
                                showrooms={showrooms}
                                onSelect={setSelectedShowroomId}
                            />
                            {stores.length > showrooms.length && (
                                <Button
                                    variant="secondary"
                                    className="mt-6 w-full"
                                    onClick={() => setPage((value) => value + 1)}>
                                    {t('results.showMore')}
                                </Button>
                            )}
                        </>
                    )}
                </div>
            </div>
            {googleMapsApiKey && hasMappableShowrooms && (
                <div className="sticky top-24 hidden h-fit overflow-hidden border border-border bg-muted lg:block">
                    <Suspense
                        fallback={
                            <div className="h-[26rem] animate-pulse bg-muted" aria-label={t('map.loadingLabel')} />
                        }>
                        <ShowroomMap
                            apiKey={googleMapsApiKey}
                            ariaLabel={t('map.label')}
                            selectedShowroomId={selectedShowroomId}
                            showrooms={showrooms}
                            onSelect={setSelectedShowroomId}
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}
