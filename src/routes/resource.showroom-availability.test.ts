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
import { loader } from '@/routes/resource.showroom-availability';
import { createApiClients } from '@/lib/api-clients.server';

const getAvailability = vi.fn();

vi.mock('@/lib/api-clients.server', () => ({
    createApiClients: vi.fn(() => ({ shopperAvailability: { getAvailability } })),
}));

vi.mock('@/lib/logger.server', () => ({
    getLogger: () => ({ error: vi.fn() }),
}));

describe('showroom availability resource', () => {
    beforeEach(() => {
        getAvailability.mockReset();
        vi.mocked(createApiClients).mockClear();
    });

    test('rejects a request without product and inventory IDs', async () => {
        const response = await loader({
            request: new Request('https://example.com/resource/showroom-availability'),
            context: {},
            params: {},
        } as never);

        expect(response.init?.status).toBe(400);
        expect(response.data).toEqual({ success: false, availability: {} });
        expect(createApiClients).not.toHaveBeenCalled();
    });

    test('batches inventory IDs in groups of five and maps availability', async () => {
        getAvailability
            .mockResolvedValueOnce({
                data: {
                    data: [
                        {
                            id: 'product-1',
                            inventories: [
                                { id: 'i1', orderable: true },
                                { id: 'i2', orderable: false },
                            ],
                        },
                    ],
                },
            })
            .mockResolvedValueOnce({
                data: { data: [{ id: 'product-1', inventories: [{ id: 'i6', orderable: true }] }] },
            });

        const response = await loader({
            request: new Request(
                'https://example.com/resource/showroom-availability?productId=product-1&inventoryIds=i1,i2,i3,i4,i5,i6'
            ),
            context: {},
            params: {},
        } as never);

        expect(getAvailability).toHaveBeenCalledTimes(2);
        expect(getAvailability.mock.calls[0][0].params.query.inventoryIds).toEqual(['i1', 'i2', 'i3', 'i4', 'i5']);
        expect(getAvailability.mock.calls[1][0].params.query.inventoryIds).toEqual(['i6']);
        expect(response.data).toEqual({
            success: true,
            availability: {
                i1: 'available',
                i2: 'unavailable',
                i3: 'unknown',
                i4: 'unknown',
                i5: 'unknown',
                i6: 'available',
            },
        });
    });

    test('rejects requests that exceed the showroom result limit', async () => {
        const inventoryIds = Array.from({ length: 201 }, (_, index) => `i${index}`).join(',');
        const response = await loader({
            request: new Request(
                `https://example.com/resource/showroom-availability?productId=product-1&inventoryIds=${inventoryIds}`
            ),
            context: {},
            params: {},
        } as never);

        expect(response.init?.status).toBe(400);
        expect(createApiClients).not.toHaveBeenCalled();
    });

    test('degrades every inventory to unknown when SCAPI fails', async () => {
        getAvailability.mockRejectedValue(new Error('SCAPI unavailable'));
        const response = await loader({
            request: new Request(
                'https://example.com/resource/showroom-availability?productId=product-1&inventoryIds=i1,i2'
            ),
            context: {},
            params: {},
        } as never);

        expect(response.init?.status).toBe(502);
        expect(response.data).toEqual({
            success: false,
            availability: { i1: 'unknown', i2: 'unknown' },
        });
    });
});
