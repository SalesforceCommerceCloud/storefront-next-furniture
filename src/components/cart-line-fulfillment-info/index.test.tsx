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
import { render, screen } from '@testing-library/react';
import type { ShopperProducts } from '@/scapi';
import CartLineFulfillmentInfo from './index';

const makeProduct = (overrides: Record<string, unknown>): ShopperProducts.schemas['Product'] =>
    ({ id: 'sofa-1', name: 'Sofa', ...overrides }) as unknown as ShopperProducts.schemas['Product'];

describe('CartLineFulfillmentInfo', () => {
    test('renders dimensions and lead time together', () => {
        render(
            <CartLineFulfillmentInfo
                product={makeProduct({ c_width: 84, c_depth: 36, c_height: 32, c_leadTimeDays: 42 })}
            />
        );
        expect(screen.getByText('84W x 36D x 32H in')).toBeInTheDocument();
        expect(screen.getByText('Ships in 42 days')).toBeInTheDocument();
    });

    test('renders "Ships in 1 day" for a lead time of exactly one day', () => {
        render(<CartLineFulfillmentInfo product={makeProduct({ c_leadTimeDays: 1 })} />);
        expect(screen.getByText('Ships in 1 day')).toBeInTheDocument();
    });

    test('quickShip wins over a lead time when both are present', () => {
        render(<CartLineFulfillmentInfo product={makeProduct({ c_quickShip: true, c_leadTimeDays: 42 })} />);
        expect(screen.getByText('Ships quickly')).toBeInTheDocument();
        expect(screen.queryByText('Ships in 42 days')).not.toBeInTheDocument();
    });

    test('renders nothing when the product has no dimension or shipping custom attributes', () => {
        const { container } = render(<CartLineFulfillmentInfo product={makeProduct({})} />);
        expect(container).toBeEmptyDOMElement();
    });

    test('renders nothing for a null product', () => {
        const { container } = render(<CartLineFulfillmentInfo product={null} />);
        expect(container).toBeEmptyDOMElement();
    });
});
