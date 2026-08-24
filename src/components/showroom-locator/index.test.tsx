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
import { StrictMode } from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import ShowroomLocator from '@/components/showroom-locator';

const load = vi.fn();
const useFetcher = vi.fn();

vi.mock('react-router', () => ({
    useFetcher: () => useFetcher(),
    useSearchParams: () => [new URLSearchParams('productId=product-1')],
}));

vi.mock('@salesforce/storefront-next-runtime/config', () => ({
    useConfig: () => ({ features: { googleCloudAPI: { apiKey: '' } } }),
}));

vi.mock('@/extensions/store-locator/hooks/use-store-locator-list', () => ({
    useStoreLocatorList: () => ({
        config: { radiusUnit: 'mi' },
        geoError: false,
        hasError: false,
        hasSearched: true,
        isLoading: false,
        stores: [{ id: 'store-1', inventoryId: 'inventory-1', latitude: 47.6062, longitude: -122.3321 }],
    }),
}));

vi.mock('@/components/showroom-locator/form', () => ({ default: () => null }));
vi.mock('@/components/showroom-locator/results', () => ({ default: () => null }));

describe('ShowroomLocator', () => {
    beforeEach(() => {
        load.mockReset();
        useFetcher.mockReset();
        useFetcher.mockImplementation(() => ({ data: undefined, load }));
    });

    test('loads product availability once when the fetcher object changes identity', async () => {
        const { rerender } = render(
            <StrictMode>
                <ShowroomLocator />
            </StrictMode>
        );

        await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
        rerender(
            <StrictMode>
                <ShowroomLocator />
            </StrictMode>
        );

        await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
        expect(load).toHaveBeenCalledWith(
            '/resource/showroom-availability?productId=product-1&inventoryIds=inventory-1'
        );
    });

    test('uses the data-store Maps key when no merchant key is configured', () => {
        const { container } = render(<ShowroomLocator gcpApiKey="data-store-key" />);

        expect(container.querySelector('[aria-label="Loading showroom map"]')).toBeInTheDocument();
    });
});
