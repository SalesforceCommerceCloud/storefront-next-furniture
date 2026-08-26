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
import { getShippingEstimate } from './shipping-estimate';

const makeProduct = (overrides: Record<string, unknown>): ShopperProducts.schemas['Product'] =>
    ({ id: 'sofa-1', name: 'Sofa', ...overrides }) as unknown as ShopperProducts.schemas['Product'];

describe('getShippingEstimate', () => {
    test('returns null for a null or undefined product', () => {
        expect(getShippingEstimate(null)).toBeNull();
        expect(getShippingEstimate(undefined)).toBeNull();
    });

    test('returns null when neither custom attribute is set', () => {
        expect(getShippingEstimate(makeProduct({}))).toBeNull();
    });

    test('reads c_leadTimeDays', () => {
        expect(getShippingEstimate(makeProduct({ c_leadTimeDays: 42 }))).toEqual({
            leadTimeDays: 42,
            quickShip: undefined,
        });
    });

    test('reads c_quickShip', () => {
        expect(getShippingEstimate(makeProduct({ c_quickShip: true }))).toEqual({
            leadTimeDays: undefined,
            quickShip: true,
        });
    });

    test('ignores wrongly-typed values', () => {
        expect(getShippingEstimate(makeProduct({ c_leadTimeDays: '42' }))).toBeNull();
    });
});
