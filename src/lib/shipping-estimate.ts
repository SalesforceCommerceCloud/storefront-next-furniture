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
import type { ShopperProducts } from '@/scapi';

export interface ShippingEstimate {
    leadTimeDays?: number;
    quickShip?: boolean;
}

/**
 * Reads a product's `c_leadTimeDays` (int, days until a made-to-order item ships) and
 * `c_quickShip` (bool, true for in-stock items that ship without a lead time) merchant custom
 * attributes. Neither is declared on the generated `Product` schema — they resolve through its
 * permissive index signature as `unknown` — so each field is narrowed with `typeof` rather than
 * trusted directly. SCAPI includes merchant custom attributes on the product response
 * unconditionally, so no `custom_properties` expand is needed to see them.
 */
export function getShippingEstimate(
    product: ShopperProducts.schemas['Product'] | undefined | null
): ShippingEstimate | null {
    if (!product) return null;
    const p = product as Record<string, unknown>;

    const leadTimeDays = typeof p.c_leadTimeDays === 'number' ? p.c_leadTimeDays : undefined;
    const quickShip = typeof p.c_quickShip === 'boolean' ? p.c_quickShip : undefined;
    if (leadTimeDays === undefined && quickShip === undefined) {
        return null;
    }

    return { leadTimeDays, quickShip };
}
