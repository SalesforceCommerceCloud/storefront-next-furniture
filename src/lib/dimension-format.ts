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

export interface ProductDimensions {
    width?: number;
    depth?: number;
    height?: number;
    unit: string;
}

/**
 * Reads W x D x H off a product's merchant custom attributes (`c_width`, `c_depth`, `c_height`,
 * `c_dimensionUnit`). These are not declared on the generated `Product` schema — they resolve
 * through its permissive index signature as `unknown` — so each field is narrowed with `typeof`
 * rather than trusted directly. SCAPI includes merchant custom attributes on the product
 * response unconditionally, so no `custom_properties` expand is needed to see them.
 */
export function getProductDimensions(
    product: ShopperProducts.schemas['Product'] | undefined | null
): ProductDimensions | null {
    if (!product) return null;
    const p = product as Record<string, unknown>;

    const width = typeof p.c_width === 'number' ? p.c_width : undefined;
    const depth = typeof p.c_depth === 'number' ? p.c_depth : undefined;
    const height = typeof p.c_height === 'number' ? p.c_height : undefined;
    if (width === undefined && depth === undefined && height === undefined) {
        return null;
    }

    const unit = typeof p.c_dimensionUnit === 'string' && p.c_dimensionUnit ? p.c_dimensionUnit : 'in';
    return { width, depth, height, unit };
}

/**
 * Formats dimensions as a compact "84W x 36D x 32H in" string, omitting any axis with no value.
 */
export function formatProductDimensions(dimensions: ProductDimensions | null): string | null {
    if (!dimensions) return null;

    const parts: string[] = [];
    if (dimensions.width !== undefined) parts.push(`${dimensions.width}W`);
    if (dimensions.depth !== undefined) parts.push(`${dimensions.depth}D`);
    if (dimensions.height !== undefined) parts.push(`${dimensions.height}H`);
    if (!parts.length) return null;

    return `${parts.join(' x ')} ${dimensions.unit}`;
}
