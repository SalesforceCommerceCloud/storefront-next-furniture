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
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import { getTranslation } from '@salesforce/storefront-next-runtime/i18n';
import { mockConfig, mockLocale, mockSiteObject } from '@/test-utils/config';
import type { EnrichedProductItem } from '@/lib/product/product-utils';
import ProductItem from './index';

function renderLine(amounts: Partial<EnrichedProductItem>) {
    const element: ReactNode = (
        <ConfigProvider config={mockConfig}>
            <SiteProvider
                site={mockSiteObject}
                locale={mockLocale}
                language={mockSiteObject.defaultLocale}
                currency={mockSiteObject.defaultCurrency}>
                <ProductItem
                    productItem={{ itemId: 'line', productId: 'sofa', productName: 'Sofa', quantity: 2, ...amounts }}
                />
            </SiteProvider>
        </ConfigProvider>
    );
    const router = createMemoryRouter([{ path: '/cart', element }], { initialEntries: ['/cart'] });
    return render(<RouterProvider router={router} />);
}

describe('Furniture calculated prices', () => {
    it('does not invent Free or a zero each amount when no native amount exists', () => {
        renderLine({});
        expect(screen.getByTestId('desktop-product-price')).toHaveTextContent(
            getTranslation().t('product:price.unavailable')
        );
        expect(screen.queryByText(getTranslation().t('miniCart:free'))).not.toBeInTheDocument();
        expect(screen.queryByText(/0[.,]00 each/)).not.toBeInTheDocument();
    });

    it('preserves an explicit native free amount', () => {
        renderLine({ basePrice: 0, price: 0, priceAfterItemDiscount: 0 });
        expect(screen.getByText(getTranslation().t('miniCart:free'))).toBeInTheDocument();
        expect(screen.getByTestId('desktop-product-price')).not.toHaveTextContent(
            getTranslation().t('product:price.unavailable')
        );
    });

    it('uses the calculated discounted line amount and its unit amount', () => {
        renderLine({ basePrice: 10, price: 20, priceAfterItemDiscount: 18 });
        expect(screen.getByTestId('desktop-product-price')).toHaveTextContent('£18.00');
        expect(screen.getByText('£9.00 each')).toBeInTheDocument();
    });

    it('retains a native base amount when optional line fields are absent', () => {
        renderLine({ basePrice: 10 });
        expect(screen.getByTestId('desktop-product-price')).toHaveTextContent('£20.00');
        expect(screen.getByText('£10.00 each')).toBeInTheDocument();
        expect(screen.queryByText(getTranslation().t('miniCart:free'))).not.toBeInTheDocument();
    });
});
