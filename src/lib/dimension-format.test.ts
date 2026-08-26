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
import { getProductDimensions, formatProductDimensions } from './dimension-format';

const makeProduct = (overrides: Record<string, unknown>): ShopperProducts.schemas['Product'] =>
    ({ id: 'sofa-1', name: 'Sofa', ...overrides }) as unknown as ShopperProducts.schemas['Product'];

describe('getProductDimensions', () => {
    test('returns null for a null or undefined product', () => {
        expect(getProductDimensions(null)).toBeNull();
        expect(getProductDimensions(undefined)).toBeNull();
    });

    test('returns null when no dimension custom attributes are set', () => {
        expect(getProductDimensions(makeProduct({}))).toBeNull();
    });

    test('reads width/depth/height and defaults the unit to "in"', () => {
        expect(getProductDimensions(makeProduct({ c_width: 84, c_depth: 36, c_height: 32 }))).toEqual({
            width: 84,
            depth: 36,
            height: 32,
            unit: 'in',
        });
    });

    test('uses c_dimensionUnit when present', () => {
        expect(getProductDimensions(makeProduct({ c_width: 213, c_dimensionUnit: 'cm' }))).toEqual({
            width: 213,
            depth: undefined,
            height: undefined,
            unit: 'cm',
        });
    });

    test('ignores non-number values on the custom attributes', () => {
        expect(getProductDimensions(makeProduct({ c_width: '84' }))).toBeNull();
    });
});

describe('formatProductDimensions', () => {
    test('returns null for null input', () => {
        expect(formatProductDimensions(null)).toBeNull();
    });

    test('formats all three axes', () => {
        expect(formatProductDimensions({ width: 84, depth: 36, height: 32, unit: 'in' })).toBe('84W x 36D x 32H in');
    });

    test('omits axes with no value', () => {
        expect(formatProductDimensions({ width: 84, unit: 'in' })).toBe('84W in');
    });
});
