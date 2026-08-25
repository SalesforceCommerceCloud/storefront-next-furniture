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
import ConfigurationSummary from './configuration-summary';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-US' } }),
}));

vi.mock('@salesforce/storefront-next-runtime/site-context', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        useSite: vi.fn(() => ({
            site: { id: 'furniture', defaultLocale: 'en-US' },
            language: 'en-US',
            currency: 'USD',
        })),
    };
});

let mockView: { product: Record<string, unknown>; currentVariant: Record<string, unknown> | null } = {
    product: {},
    currentVariant: null,
};
vi.mock('@/providers/product-view', () => ({
    useProductView: () => mockView,
}));

const configurableProduct = {
    currency: 'USD',
    variationAttributes: [
        { id: 'size', name: 'Size', values: [{ value: 'loveseat', name: 'Loveseat (64" W)' }] },
        { id: 'fabric', name: 'Fabric', values: [{ value: 'slate-linen', name: 'Slate Linen' }] },
    ],
};

describe('ConfigurationSummary', () => {
    test('renders nothing until a full variant is resolved', () => {
        mockView = { product: configurableProduct, currentVariant: null };
        render(<ConfigurationSummary />);
        expect(document.querySelector('[data-slot="configuration-summary"]')).not.toBeInTheDocument();
    });

    test('renders one row per variation attribute plus the variant total', () => {
        mockView = {
            product: configurableProduct,
            currentVariant: { variationValues: { size: 'loveseat', fabric: 'slate-linen' }, price: 1599 },
        };
        render(<ConfigurationSummary />);

        expect(document.querySelector('[data-slot="configuration-summary"]')).toBeInTheDocument();
        expect(screen.getByText('Size:')).toBeInTheDocument();
        expect(screen.getByText('Loveseat (64" W)')).toBeInTheDocument();
        expect(screen.getByText('Fabric:')).toBeInTheDocument();
        expect(screen.getByText('Slate Linen')).toBeInTheDocument();
        // total renders the variant price (currency-symbol-agnostic assertion)
        const total = document.querySelector('[data-slot="configuration-total"]');
        expect(total?.textContent).toMatch(/1,599/);
    });

    test('falls back to the master price when the variant has none', () => {
        mockView = {
            product: { ...configurableProduct, price: 1899 },
            currentVariant: { variationValues: { size: 'loveseat', fabric: 'slate-linen' } },
        };
        render(<ConfigurationSummary />);
        expect(document.querySelector('[data-slot="configuration-total"]')?.textContent).toMatch(/1,899/);
    });
});
