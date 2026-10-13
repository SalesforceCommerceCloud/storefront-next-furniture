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

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { action } from './action.swatch-order';
import { getBasket } from '@/middlewares/basket.server';
import { createApiClients } from '@/lib/api-clients.server';
import { getAuth } from '@/middlewares/auth.server';
import { getCustomerProfileForCheckout } from '@/lib/api/customer.server';
import { fetchSearchProducts } from '@/lib/api/search.server';

vi.mock('@/middlewares/basket.server');
vi.mock('@/lib/api-clients.server');
vi.mock('@/middlewares/auth.server');
vi.mock('@/lib/api/customer.server');
vi.mock('@/lib/api/search.server');

const { createContext: reactCreateContext, actualReactRouter } = vi.hoisted(() => {
    // oxlint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    // oxlint-disable-next-line @typescript-eslint/no-require-imports
    const reactRouter = require('react-router');
    return { createContext: React.createContext, actualReactRouter: reactRouter };
});
vi.mock('react-router', () => ({ ...actualReactRouter, createContext: reactCreateContext }));
vi.mock('@salesforce/storefront-next-runtime/i18n', () => ({
    getTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/lib/logger.server', () => ({
    getLogger: vi.fn(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() })),
}));

import { createFormDataRequest } from '@/test-utils/request-helpers';
import { createActionArgs, expectStatus } from '@/lib/test-utils';

const PATTERN = '/action/swatch-order';
const url = `http://localhost${PATTERN}`;

// The canonical swatch set the action validates against (fetched from the fabric-swatches category).
const SWATCH_IDS = [
    'fabric-swatch-slate-linen',
    'fabric-swatch-sage-linen',
    'fabric-swatch-navy-velvet',
    'fabric-swatch-rust-velvet',
    'fabric-swatch-charcoal-leather',
    'fabric-swatch-ivory-performance',
];

const swatchBasket = {
    basketId: 'b1',
    productItems: [
        { itemId: 's1', productId: 'fabric-swatch-slate-linen', quantity: 1, price: 0 },
        { itemId: 's2', productId: 'fabric-swatch-navy-velvet', quantity: 1, price: 0 },
    ],
};

const mockClients = {
    shopperBasketsV2: {
        addItemToBasket: vi.fn(),
        getBasket: vi.fn(),
        removeItemFromBasket: vi.fn(),
    },
};

const run = (fields: Record<string, string>) =>
    action(createActionArgs(createFormDataRequest(url, 'POST', fields), {} as any, { pattern: PATTERN }));

describe('action.swatch-order', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getBasket).mockResolvedValue({
            current: { basketId: 'b1', productItems: [] },
            snapshot: null,
        } as any);
        vi.mocked(createApiClients).mockReturnValue(mockClients as any);
        vi.mocked(getAuth).mockReturnValue({ userType: 'registered', customerId: 'cust-1' } as any);
        vi.mocked(getCustomerProfileForCheckout).mockResolvedValue({ customer: {} } as any);
        vi.mocked(fetchSearchProducts).mockResolvedValue({
            hits: SWATCH_IDS.map((productId) => ({ productId })),
        } as any);
        mockClients.shopperBasketsV2.addItemToBasket.mockResolvedValue({ data: swatchBasket });
        mockClients.shopperBasketsV2.getBasket.mockResolvedValue({ data: swatchBasket });
        mockClients.shopperBasketsV2.removeItemFromBasket.mockResolvedValue({ data: swatchBasket });
    });

    test('rejects a guest with 401 and does not touch the basket', async () => {
        vi.mocked(getAuth).mockReturnValue({ userType: 'guest' } as any);

        const result = await run({ selectedProductIds: JSON.stringify(['fabric-swatch-slate-linen']) });

        expectStatus(result, 401);
        expect(result.data.success).toBe(false);
        expect(result.data.error?.code).toBe('NOT_AUTHENTICATED');
        expect(mockClients.shopperBasketsV2.addItemToBasket).not.toHaveBeenCalled();
    });

    test('blocks a shopper who already claimed their free swatches (403)', async () => {
        vi.mocked(getCustomerProfileForCheckout).mockResolvedValue({
            customer: { c_swatchSetClaimedAt: '2026-01-01T00:00:00.000Z' },
        } as any);

        const result = await run({ selectedProductIds: JSON.stringify(['fabric-swatch-slate-linen']) });

        expectStatus(result, 403);
        expect(result.data.success).toBe(false);
        expect(mockClients.shopperBasketsV2.addItemToBasket).not.toHaveBeenCalled();
    });

    test('rejects a selection over the max of 5 (400)', async () => {
        const six = [
            'fabric-swatch-slate-linen',
            'fabric-swatch-sage-linen',
            'fabric-swatch-navy-velvet',
            'fabric-swatch-rust-velvet',
            'fabric-swatch-charcoal-leather',
            'fabric-swatch-ivory-performance',
        ];

        const result = await run({ selectedProductIds: JSON.stringify(six) });

        expectStatus(result, 400);
        expect(result.data.success).toBe(false);
        expect(mockClients.shopperBasketsV2.addItemToBasket).not.toHaveBeenCalled();
    });

    test('adds selected swatches as regular $0 lines (no bonus mechanism)', async () => {
        const result = await run({
            selectedProductIds: JSON.stringify(['fabric-swatch-slate-linen', 'fabric-swatch-navy-velvet']),
        });

        expect(result.data.success).not.toBe(false);
        // Adds the selected swatches as regular $0 product lines (no bonusDiscountLineItemId).
        expect(mockClients.shopperBasketsV2.addItemToBasket).toHaveBeenCalledWith(
            expect.objectContaining({
                body: [
                    { productId: 'fabric-swatch-slate-linen', quantity: 1 },
                    { productId: 'fabric-swatch-navy-velvet', quantity: 1 },
                ],
            })
        );
    });

    test('reconciles selection (removes deselected, adds newly selected)', async () => {
        vi.mocked(getBasket).mockResolvedValue({
            current: {
                basketId: 'b1',
                productItems: [
                    { itemId: 's1', productId: 'fabric-swatch-slate-linen', quantity: 1 },
                    { itemId: 's2', productId: 'fabric-swatch-navy-velvet', quantity: 1 },
                ],
            },
            snapshot: null,
        } as any);

        const result = await run({
            selectedProductIds: JSON.stringify(['fabric-swatch-slate-linen', 'fabric-swatch-sage-linen']),
        });

        expect(result.data.success).not.toBe(false);
        // Removes navy (deselected)
        expect(mockClients.shopperBasketsV2.removeItemFromBasket).toHaveBeenCalledWith(
            expect.objectContaining({ params: { path: { basketId: 'b1', itemId: 's2' } } })
        );
        // Adds sage (newly selected)
        expect(mockClients.shopperBasketsV2.addItemToBasket).toHaveBeenCalledWith(
            expect.objectContaining({
                body: [{ productId: 'fabric-swatch-sage-linen', quantity: 1 }],
            })
        );
    });

    test('rejects invalid JSON with 400 and does not clear existing lines', async () => {
        const result = await run({ selectedProductIds: 'not-json' });

        expectStatus(result, 400);
        expect(result.data.success).toBe(false);
        expect(result.data.error?.code).toBe('INVALID_INPUT');
        expect(mockClients.shopperBasketsV2.addItemToBasket).not.toHaveBeenCalled();
        expect(mockClients.shopperBasketsV2.removeItemFromBasket).not.toHaveBeenCalled();
    });

    test('rejects a non-swatch product id with 400 (cannot add arbitrary products for free)', async () => {
        const result = await run({
            selectedProductIds: JSON.stringify(['fabric-swatch-slate-linen', 'some-real-sofa-sku']),
        });

        expectStatus(result, 400);
        expect(result.data.success).toBe(false);
        expect(result.data.error?.code).toBe('INVALID_INPUT');
        expect(mockClients.shopperBasketsV2.addItemToBasket).not.toHaveBeenCalled();
    });

    test('dedupes repeated ids so a swatch is added at most once (maxQtyPerSwatch)', async () => {
        const result = await run({
            selectedProductIds: JSON.stringify([
                'fabric-swatch-slate-linen',
                'fabric-swatch-slate-linen',
                'fabric-swatch-slate-linen',
            ]),
        });

        expect(result.data.success).not.toBe(false);
        expect(mockClients.shopperBasketsV2.addItemToBasket).toHaveBeenCalledWith(
            expect.objectContaining({
                body: [{ productId: 'fabric-swatch-slate-linen', quantity: 1 }],
            })
        );
    });

    test('degrades to 503 (not an unhandled crash) when the swatch catalog lookup fails', async () => {
        vi.mocked(fetchSearchProducts).mockRejectedValueOnce(new Error('shopper search unavailable'));

        const result = await run({ selectedProductIds: JSON.stringify(['fabric-swatch-slate-linen']) });

        expectStatus(result, 503);
        expect(result.data.success).toBe(false);
        expect(mockClients.shopperBasketsV2.addItemToBasket).not.toHaveBeenCalled();
        expect(mockClients.shopperBasketsV2.removeItemFromBasket).not.toHaveBeenCalled();
    });
});
