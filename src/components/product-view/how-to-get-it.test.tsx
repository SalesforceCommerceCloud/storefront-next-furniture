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
import { describe, test, expect, vi } from 'vitest';
import HowToGetIt from './how-to-get-it';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }),
}));

// Reuse-verbatim contract: HowToGetIt only wraps the canonical DeliveryOptions. Stub it so the test
// asserts the furniture wrapper + gating without pulling in the bopis provider stack.
vi.mock('@/extensions/bopis/components/delivery-options/delivery-options', () => ({
    default: (props: { quantity: number }) => (
        <div data-testid="delivery-options-stub" data-quantity={props.quantity} />
    ),
}));

let mockView: Record<string, unknown>;
vi.mock('@/providers/product-view', () => ({
    useProductView: () => mockView,
}));

const inStockProduct = { id: 'sofa-1', type: { variant: false }, inventory: { orderable: true, ats: 5 } };

describe('HowToGetIt', () => {
    test('renders the "How to get it" section wrapping DeliveryOptions for an in-stock product', () => {
        mockView = {
            product: inStockProduct,
            currentVariant: null,
            quantity: 2,
            basketPickupStore: undefined,
            isOutOfStock: false,
        };
        render(<HowToGetIt />);

        expect(document.querySelector('[data-section="how-to-get-it"]')).toBeInTheDocument();
        expect(screen.getByText('howToGetIt')).toBeInTheDocument();
        const stub = screen.getByTestId('delivery-options-stub');
        expect(stub).toBeInTheDocument();
        // Quantity is threaded through from the product-view context.
        expect(stub).toHaveAttribute('data-quantity', '2');
    });

    test('renders nothing when the product is out of stock', () => {
        mockView = {
            product: inStockProduct,
            currentVariant: null,
            quantity: 1,
            basketPickupStore: undefined,
            isOutOfStock: true,
        };
        render(<HowToGetIt />);

        expect(document.querySelector('[data-section="how-to-get-it"]')).not.toBeInTheDocument();
        expect(screen.queryByTestId('delivery-options-stub')).not.toBeInTheDocument();
    });

    test('renders nothing for product sets and bundles', () => {
        mockView = {
            product: { ...inStockProduct, type: { set: true } },
            currentVariant: null,
            quantity: 1,
            basketPickupStore: undefined,
            isOutOfStock: false,
        };
        const { rerender } = render(<HowToGetIt />);
        expect(document.querySelector('[data-section="how-to-get-it"]')).not.toBeInTheDocument();

        mockView = { ...mockView, product: { ...inStockProduct, type: { bundle: true } } };
        rerender(<HowToGetIt />);
        expect(document.querySelector('[data-section="how-to-get-it"]')).not.toBeInTheDocument();
    });
});
