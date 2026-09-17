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
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ApiError } from '@/scapi';
import { NormalizedApiError } from '@/lib/api/normalized-api-error';
import { siteContext } from '@salesforce/storefront-next-runtime/site-context';

const { mockFetchProductById, mockAttemptRouteSeoFallback } = vi.hoisted(() => ({
    mockFetchProductById: vi.fn(),
    mockAttemptRouteSeoFallback: vi.fn(),
}));

vi.mock('@/lib/api/products.server', () => ({ fetchProductById: mockFetchProductById }));
vi.mock('@/lib/seo/route-fallback.server', () => ({ attemptRouteSeoFallback: mockAttemptRouteSeoFallback }));
vi.mock('@/lib/page-designer/page-loader.server', () => ({
    fetchPageWithComponentData: vi.fn(() => Promise.resolve({ id: 'pdp', regions: [] })),
}));
vi.mock('../lib/pdp-recommendations.server', () => ({
    fetchRoomCandidatePool: vi.fn(() => Promise.resolve([])),
    deriveYouMightAlsoLike: vi.fn(),
    deriveCompleteTheRoom: vi.fn(),
}));
vi.mock('../lib/service-addons.server', () => ({ fetchServiceAddons: vi.fn() }));
vi.mock('@salesforce/storefront-next-runtime/i18n', () => ({
    getTranslation: vi.fn(() => ({ i18next: { t: (key: string) => key } })),
}));

import { loader } from './_app.product.$productId';

describe('Furniture product route loader fallback', () => {
    const context = {
        get: vi.fn((key) =>
            key === siteContext ? { currency: 'USD', site: { id: 'test-site' }, locale: { id: 'en-US' } } : undefined
        ),
    } as any;
    const invoke = (path: string) => {
        const request = new Request(`https://example.com/product/${path}`);
        return loader({
            request,
            params: { siteId: 'test-site', localeId: 'en-US', productId: path },
            context,
            url: new URL(request.url),
            pattern: '',
        });
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockAttemptRouteSeoFallback.mockResolvedValue(undefined);
    });

    test('uses the unchanged .html path ID without fallback on primary success', async () => {
        mockFetchProductById.mockResolvedValue({ id: 'legacy.html' });
        await invoke('legacy.html');
        expect(mockFetchProductById.mock.calls[0][1]).toBe('legacy.html');
        expect(mockAttemptRouteSeoFallback).not.toHaveBeenCalled();
    });

    test('attempts fallback once only for an authoritative path 404', async () => {
        mockFetchProductById.mockRejectedValue(furnitureLoaderError(404));
        await expect(invoke('missing')).rejects.toBeInstanceOf(Response);
        expect(mockAttemptRouteSeoFallback).toHaveBeenCalledOnce();
    });

    test('does not attempt fallback for a non-404 failure', async () => {
        mockFetchProductById.mockRejectedValue(furnitureLoaderError(500));
        await expect(invoke('failure')).rejects.toBeInstanceOf(Response);
        expect(mockAttemptRouteSeoFallback).not.toHaveBeenCalled();
    });
});

function furnitureLoaderError(status: number): NormalizedApiError {
    return new NormalizedApiError(
        new ApiError({
            status,
            statusText: 'Failure',
            headers: new Headers(),
            body: { type: 'Failure', title: 'Failure', detail: 'failure' },
            rawBody: '{}',
            url: 'https://api.example.com/products/failure',
            method: 'GET',
        })
    );
}
