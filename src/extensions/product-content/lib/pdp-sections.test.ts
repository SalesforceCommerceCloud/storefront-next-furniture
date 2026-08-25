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
import { describe, test, expect } from 'vitest';
import type { ShopperProducts } from '@/scapi';
import { resolvePdpSections } from './pdp-sections';

const t = (key: string) => key;

const asProduct = (attrs: Record<string, unknown>) => attrs as unknown as ShopperProducts.schemas['Product'];

async function resolveDimensions(product: ShopperProducts.schemas['Product']) {
    const section = resolvePdpSections(product).find((s) => s.labelKey === 'dimensions');
    if (!section || !('resolve' in section)) throw new Error('no dimensions section');
    const content = await section.resolve(product, t);
    if (!content || content.contentType !== 'spec-table') throw new Error('expected spec-table content');
    return content;
}

describe('furniture resolvePdpSections — Dimensions', () => {
    test('emits spec-table content with imperial + metric views when metric attrs exist', async () => {
        const content = await resolveDimensions(
            asProduct({
                c_width: 84,
                c_widthCm: 213,
                c_height: 34,
                c_heightCm: 86,
                c_weight: 96,
                c_weightKg: 44,
                c_dimensionUnit: 'in',
            })
        );

        expect(content.views).toHaveLength(2);
        expect(content.defaultViewId).toBe('imperial');
        expect(content.rows?.find((r) => r.label === 'furnitureSpec.width')?.values).toEqual({
            imperial: '84 in',
            metric: '213 cm',
        });
        expect(content.rows?.find((r) => r.label === 'furnitureSpec.weight')?.values).toEqual({
            imperial: '96 lbs',
            metric: '44 kg',
        });
    });

    test('degrades to a single-view table when metric partner attrs are absent', async () => {
        const content = await resolveDimensions(asProduct({ c_width: 84, c_dimensionUnit: 'in' }));

        expect(content.views).toBeUndefined();
        expect(content.rows?.find((r) => r.label === 'furnitureSpec.width')?.values).toEqual({ imperial: '84 in' });
    });

    test("falls back to 'in' when c_dimensionUnit is missing or not a string", async () => {
        // A truthy non-string value must not be rendered as the unit — it degrades to the default.
        const missing = await resolveDimensions(asProduct({ c_width: 84 }));
        expect(missing.rows?.find((r) => r.label === 'furnitureSpec.width')?.values).toEqual({ imperial: '84 in' });

        const nonString = await resolveDimensions(asProduct({ c_width: 84, c_dimensionUnit: 42 }));
        expect(nonString.rows?.find((r) => r.label === 'furnitureSpec.width')?.values).toEqual({ imperial: '84 in' });
    });
});

describe('furniture resolvePdpSections — Specifications', () => {
    test('emits a grouped spec-table: switchable Dimensions + static Materials', async () => {
        const product = asProduct({
            c_width: 84,
            c_widthCm: 213,
            c_weight: 96,
            c_weightKg: 44,
            c_dimensionUnit: 'in',
            c_materialFrame: 'Kiln-dried oak',
        });
        const section = resolvePdpSections(product).find((s) => s.labelKey === 'specifications');
        if (!section || !('resolve' in section)) throw new Error('no specifications section');
        const content = await section.resolve(product, t);
        if (!content || content.contentType !== 'spec-table') throw new Error('expected spec-table content');

        // Two labeled subsections, and the same Imperial/Metric switch as the Dimensions section.
        expect(content.groups?.map((g) => g.heading)).toEqual(['dimensions', 'materials']);
        expect(content.views).toHaveLength(2);
        // Dimensions rows carry both unit systems (the switch flips them).
        const dims = content.groups?.find((g) => g.heading === 'dimensions');
        expect(dims?.rows.find((r) => r.label === 'furnitureSpec.width')?.values).toEqual({
            imperial: '84 in',
            metric: '213 cm',
        });
        // Material rows are single-value (stay static across the switch).
        const materials = content.groups?.find((g) => g.heading === 'materials');
        expect(materials?.rows.find((r) => r.label === 'furnitureSpec.frame')?.values).toEqual({
            imperial: 'Kiln-dried oak',
        });
    });
});
