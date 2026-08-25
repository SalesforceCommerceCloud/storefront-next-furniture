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
import type { ShopperProducts, ShopperSearch } from '@/scapi';
import { createTestContext } from '@/lib/test-utils';
import { fetchCarouselProducts } from '@/components/product-carousel/loaders';
import { fetchRoomCandidatePool, deriveYouMightAlsoLike, deriveCompleteTheRoom } from './pdp-recommendations.server';

vi.mock('@/components/product-carousel/loaders', () => ({
    fetchCarouselProducts: vi.fn(),
}));

const mockFetchCarouselProducts = vi.mocked(fetchCarouselProducts);

function buildProduct(overrides: Record<string, unknown> = {}): ShopperProducts.schemas['Product'] {
    return {
        id: 'current-product',
        primaryCategory: { id: 'living-room' },
        c_style: 'modern',
        ...overrides,
    } as ShopperProducts.schemas['Product'];
}

function buildHit(overrides: Record<string, unknown> = {}): ShopperSearch.schemas['ProductSearchHit'] {
    return { productId: 'other-product', ...overrides } as ShopperSearch.schemas['ProductSearchHit'];
}

describe('fetchRoomCandidatePool', () => {
    beforeEach(() => {
        mockFetchCarouselProducts.mockReset();
    });

    test("scopes the search to the product's room and forwards the active currency", async () => {
        mockFetchCarouselProducts.mockResolvedValue({
            hits: [buildHit({ productId: 'room-1' })],
        } as ShopperSearch.schemas['ProductSearchResult']);

        const hits = await fetchRoomCandidatePool(createTestContext({ currency: 'GBP' }), buildProduct());

        expect(mockFetchCarouselProducts).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ categoryId: 'living-room', currency: 'GBP' })
        );
        expect(hits).toHaveLength(1);
    });

    test('falls back to the c_room custom attribute when there is no primary category', async () => {
        mockFetchCarouselProducts.mockResolvedValue({
            hits: [],
        } as unknown as ShopperSearch.schemas['ProductSearchResult']);

        await fetchRoomCandidatePool(
            createTestContext(),
            buildProduct({ primaryCategory: undefined, c_room: 'bedroom' })
        );

        expect(mockFetchCarouselProducts).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ categoryId: 'bedroom' })
        );
    });

    test('returns an empty pool without searching when the product has no room', async () => {
        const hits = await fetchRoomCandidatePool(
            createTestContext(),
            buildProduct({ primaryCategory: undefined, c_room: undefined })
        );

        expect(hits).toEqual([]);
        expect(mockFetchCarouselProducts).not.toHaveBeenCalled();
    });

    test('returns an empty pool when the search fails', async () => {
        mockFetchCarouselProducts.mockRejectedValue(new Error('SCAPI down'));
        expect(await fetchRoomCandidatePool(createTestContext(), buildProduct())).toEqual([]);
    });
});

describe('deriveYouMightAlsoLike', () => {
    test('excludes the current product and prefers same-style hits', () => {
        const result = deriveYouMightAlsoLike(
            [
                buildHit({ productId: 'current-product', c_style: 'modern' }),
                buildHit({ productId: 'other-style', c_style: 'traditional' }),
                buildHit({ productId: 'same-style', c_style: 'modern' }),
            ],
            buildProduct(),
            1
        );

        expect(result.recs).toHaveLength(1);
        expect(result.recs?.[0].productId).toBe('same-style');
    });

    test('backfills with other-style hits when same-style is short of the limit', () => {
        const result = deriveYouMightAlsoLike(
            [
                buildHit({ productId: 'same-style', c_style: 'modern' }),
                buildHit({ productId: 'other-style', c_style: 'rustic' }),
            ],
            buildProduct(),
            5
        );

        expect(result.recs?.map((h) => h.productId)).toEqual(['same-style', 'other-style']);
    });

    test('excludes the current product on a variant PDP by matching the master sku', () => {
        const product = buildProduct({ id: 'variant-abc', master: { masterId: 'master-123' } });
        const result = deriveYouMightAlsoLike(
            [buildHit({ productId: 'master-123' }), buildHit({ productId: 'sibling-1' })],
            product
        );

        expect(result.recs?.map((h) => h.productId)).toEqual(['sibling-1']);
    });

    test('returns empty for an empty pool', () => {
        expect(deriveYouMightAlsoLike([], buildProduct())).toEqual({});
    });
});

describe('deriveCompleteTheRoom', () => {
    test('returns the room remainder, distinct from You Might Also Like', () => {
        const hits = [
            buildHit({ productId: 'current-product', c_style: 'modern' }),
            buildHit({ productId: 'a', c_style: 'modern' }),
            buildHit({ productId: 'b', c_style: 'traditional' }),
            buildHit({ productId: 'c', c_style: 'rustic' }),
        ];
        const product = buildProduct();
        // Both rails render with the same limit; deriveCompleteTheRoom excludes the also-like set
        // computed at that same limit, so the two are non-overlapping.
        const alsoLike = deriveYouMightAlsoLike(hits, product, 1);
        const complete = deriveCompleteTheRoom(hits, product, 1);

        const alsoLikeIds = new Set(alsoLike.recs?.map((h) => h.productId));
        const completeIds = complete.recs?.map((h) => h.productId) ?? [];
        // No overlap between the two rails, and self excluded from both.
        expect(completeIds).not.toContain('current-product');
        expect(completeIds.some((id) => alsoLikeIds.has(id))).toBe(false);
        expect(completeIds.length).toBeGreaterThan(0);
    });

    test('returns empty when the pool holds only the current product', () => {
        expect(deriveCompleteTheRoom([buildHit({ productId: 'current-product' })], buildProduct())).toEqual({});
    });
});

describe('shared room pool', () => {
    beforeEach(() => {
        mockFetchCarouselProducts.mockReset();
    });

    test('derives both rails from a single SCAPI search', async () => {
        mockFetchCarouselProducts.mockResolvedValue({
            hits: [
                buildHit({ productId: 'sib-1', c_style: 'modern' }),
                buildHit({ productId: 'sib-2', c_style: 'traditional' }),
            ],
        } as unknown as ShopperSearch.schemas['ProductSearchResult']);

        const product = buildProduct();
        const pool = await fetchRoomCandidatePool(createTestContext(), product);
        const alsoLike = deriveYouMightAlsoLike(pool, product, 1);
        const complete = deriveCompleteTheRoom(pool, product, 1);

        expect(mockFetchCarouselProducts).toHaveBeenCalledTimes(1);
        expect(alsoLike.recs?.[0].productId).toBe('sib-1'); // same-style preferred
        expect(complete.recs?.map((h) => h.productId)).toEqual(['sib-2']); // remainder after also-like
    });
});
