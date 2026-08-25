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
import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { ShopperProducts } from '@/scapi';
import { fetchProductById } from '@/lib/api/products.server';
import { fetchServiceAddons } from './service-addons.server';

vi.mock('@/lib/api/products.server', () => ({
    fetchProductById: vi.fn(),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: () => ({ warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

const mockFetchProductById = vi.mocked(fetchProductById);
const context = {} as Parameters<typeof fetchServiceAddons>[0];

function buildServiceProduct(overrides: Record<string, unknown> = {}): ShopperProducts.schemas['Product'] {
    return {
        id: 'svc-assembly',
        name: 'Assembly',
        price: 49,
        currency: 'GBP',
        shortDescription: 'We assemble it',
        ...overrides,
    } as ShopperProducts.schemas['Product'];
}

describe('fetchServiceAddons', () => {
    beforeEach(() => mockFetchProductById.mockReset());

    test('forwards the requested currency to the product fetch (multi-currency parity)', async () => {
        mockFetchProductById.mockResolvedValue(buildServiceProduct());

        await fetchServiceAddons(context, ['svc-assembly'], 'EUR');

        expect(mockFetchProductById).toHaveBeenCalledWith(
            context,
            'svc-assembly',
            expect.objectContaining({ expand: ['prices'], currency: 'EUR' })
        );
    });

    test('omits currency when none is supplied so SCAPI uses the site default', async () => {
        mockFetchProductById.mockResolvedValue(buildServiceProduct());

        await fetchServiceAddons(context, ['svc-assembly']);

        const [, , options] = mockFetchProductById.mock.calls[0];
        expect(options).not.toHaveProperty('currency');
    });

    test('maps resolved products to service add-ons and skips failed / missing ones', async () => {
        mockFetchProductById
            .mockResolvedValueOnce(buildServiceProduct({ id: 'svc-1', name: 'Assembly', price: 49 }))
            .mockRejectedValueOnce(new Error('SCAPI down'))
            .mockResolvedValueOnce(null);

        const services = await fetchServiceAddons(context, ['svc-1', 'svc-2', 'svc-3'], 'GBP');

        expect(services).toEqual([
            { id: 'svc-1', name: 'Assembly', price: 49, currency: 'GBP', description: 'We assemble it' },
        ]);
    });
});
