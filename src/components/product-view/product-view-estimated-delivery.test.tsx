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
/** @sfdc-extension-file SFDC_EXT_SHIPPING_DELIVERY */
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import ProductView from './product-view';
import { masterProduct as mockProduct } from '@/components/__mocks__/master-variant-product';
import { AllProvidersWrapper } from '@/test-utils/context-provider';

vi.mock('@/components/image-gallery', () => ({
    default: ({ productName }: { productName?: string }) => <div data-testid="image-gallery">{productName}</div>,
}));

vi.mock('@/extensions/shipping-delivery/components/target/delivery-estimate-summary-target', () => ({
    default: () => <div data-testid="estimated-delivery-calculator" />,
}));

vi.mock('@/components/toast', () => ({
    useToast: () => ({ addToast: vi.fn() }),
}));

describe('Furniture ProductView estimated delivery', () => {
    test('renders one estimated delivery calculator', () => {
        const router = createMemoryRouter(
            [
                {
                    path: '/product/:productId',
                    element: (
                        <AllProvidersWrapper>
                            <ProductView product={mockProduct} />
                        </AllProvidersWrapper>
                    ),
                },
            ],
            { initialEntries: ['/product/test-product'] }
        );

        render(<RouterProvider router={router} />);

        expect(screen.getAllByTestId('estimated-delivery-calculator')).toHaveLength(1);
    });
});
