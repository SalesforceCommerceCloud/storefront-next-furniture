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
import { data } from 'react-router';
import type { Route } from './+types/resource.showroom-availability';
import { createApiClients } from '@/lib/api-clients.server';
import { getLogger } from '@/lib/logger.server';
import type { ShowroomAvailabilityResult, ShowroomAvailabilityStatus } from '@/components/showroom-locator/types';

const INVENTORY_BATCH_SIZE = 5;
const MAX_INVENTORY_IDS = 200;
const MAX_ID_LENGTH = 100;

export async function loader({ request, context }: Route.LoaderArgs) {
    const url = new URL(request.url);
    const productId = url.searchParams.get('productId')?.trim();
    const inventoryIds = [
        ...new Set(
            url.searchParams
                .get('inventoryIds')
                ?.split(',')
                .map((id) => id.trim())
                .filter(Boolean) ?? []
        ),
    ];

    if (
        !productId ||
        productId.length > MAX_ID_LENGTH ||
        inventoryIds.length === 0 ||
        inventoryIds.length > MAX_INVENTORY_IDS ||
        inventoryIds.some((id) => id.length > MAX_ID_LENGTH)
    ) {
        return data<ShowroomAvailabilityResult>({ success: false, availability: {} }, { status: 400 });
    }

    const clients = createApiClients(context);
    const batches = Array.from({ length: Math.ceil(inventoryIds.length / INVENTORY_BATCH_SIZE) }, (_, index) =>
        inventoryIds.slice(index * INVENTORY_BATCH_SIZE, (index + 1) * INVENTORY_BATCH_SIZE)
    );

    try {
        const responses = await Promise.all(
            batches.map((batch) =>
                clients.shopperAvailability.getAvailability({
                    params: { query: { productIds: [productId], inventoryIds: batch } },
                })
            )
        );
        const statusByInventory = new Map<string, ShowroomAvailabilityStatus>();
        for (const response of responses) {
            for (const product of response.data.data ?? []) {
                for (const inventory of product.inventories) {
                    statusByInventory.set(inventory.id, inventory.orderable ? 'available' : 'unavailable');
                }
            }
        }
        const availability = Object.fromEntries(
            inventoryIds.map((inventoryId) => [inventoryId, statusByInventory.get(inventoryId) ?? 'unknown'])
        );
        return data<ShowroomAvailabilityResult>({ success: true, availability });
    } catch (error) {
        getLogger(context).error('Showrooms: availability lookup failed', { error });
        return data<ShowroomAvailabilityResult>(
            { success: false, availability: Object.fromEntries(inventoryIds.map((id) => [id, 'unknown'])) },
            { status: 502 }
        );
    }
}
