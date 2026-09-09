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
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import type { ShopperProducts } from '@/scapi';
import SwatchGallery from '../components/swatch-gallery';

// The fabric family lives in a custom attribute the SCAPI Product type doesn't declare.
type SwatchProduct = ShopperProducts.schemas['Product'] & { c_fabricFamily?: string };

const mockSwatchProducts: SwatchProduct[] = [
    {
        id: 'fabric-swatch-slate-linen',
        name: 'Slate Gray',
        c_fabricFamily: 'Linen',
        imageGroups: [
            {
                viewType: 'large',
                images: [
                    {
                        link: '/images/swatches/slate-linen.webp',
                        alt: 'Slate Gray linen fabric swatch',
                    },
                ],
            },
        ],
    },
    {
        id: 'fabric-swatch-sage-linen',
        name: 'Sage',
        c_fabricFamily: 'Linen',
        imageGroups: [
            {
                viewType: 'large',
                images: [
                    {
                        link: '/images/swatches/sage-linen.webp',
                        alt: 'Sage linen fabric swatch',
                    },
                ],
            },
        ],
    },
    {
        id: 'fabric-swatch-navy-velvet',
        name: 'Navy',
        c_fabricFamily: 'Velvet',
        imageGroups: [
            {
                viewType: 'large',
                images: [
                    {
                        link: '/images/swatches/navy-velvet.webp',
                        alt: 'Navy velvet fabric swatch',
                    },
                ],
            },
        ],
    },
];

vi.mock('react-router', () => ({
    useFetcher: () => ({
        submit: vi.fn(),
        state: 'idle',
    }),
    useNavigation: () => ({
        state: 'idle',
    }),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => {
        const translations: Record<string, string> = {
            'meta.title': 'Free fabric swatches',
            'meta.description':
                'Compare texture, color, and finish at home before you configure. Choose up to five swatches and we will send them your way.',
            eyebrow: 'Try before you buy',
            title: 'Free fabric swatches',
            description:
                'Compare texture, color, and finish at home before you configure. Choose up to five swatches and we will send them your way.',
            'gallery.heading': 'Fabric Swatches',
            'gallery.selectHint': 'See and feel the texture before you commit.',
            'gallery.selectedCount': '{{count}} of {{max}} selected',
            'form.submit': 'Order Free Swatches',
            'form.submitting': 'Processing...',
            'alreadyOrdered.heading': 'Swatches ordered',
            'alreadyOrdered.body':
                "You've already ordered your free fabric swatches. Check your email for shipping confirmation.",
        };
        return {
            t: (key: string, options?: Record<string, unknown>) => {
                const template = translations[key] ?? key;
                if (!options) {
                    return template;
                }
                return Object.entries(options).reduce(
                    (result, [name, value]) => result.replaceAll(`{{${name}}}`, String(value)),
                    template
                );
            },
        };
    },
}));

vi.mock('@/components/dynamic-image', () => ({
    DynamicImage: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

describe('Furniture Swatches Gallery', () => {
    test('renders the gallery with products', () => {
        render(
            <SwatchGallery
                swatchProducts={mockSwatchProducts}
                alreadyOrdered={false}
                initialSelection={[]}
                maxDistinctSwatches={5}
            />
        );

        expect(screen.getByText('Slate Gray')).toBeInTheDocument();
        expect(screen.getByText('Sage')).toBeInTheDocument();
        expect(screen.getByText('Navy')).toBeInTheDocument();
    });

    test('reflects selection count', async () => {
        const user = userEvent.setup();
        render(
            <SwatchGallery
                swatchProducts={mockSwatchProducts}
                alreadyOrdered={false}
                initialSelection={[]}
                maxDistinctSwatches={5}
            />
        );

        expect(screen.getByText('0 of 5 selected')).toBeInTheDocument();

        await user.click(screen.getByRole('checkbox', { name: 'Slate Gray, Linen' }));

        expect(screen.getByText('1 of 5 selected')).toBeInTheDocument();
    });

    test('enforces max selection of 5', async () => {
        const user = userEvent.setup();
        const manyProducts: ShopperProducts.schemas['Product'][] = Array.from({ length: 6 }, (_, i) => ({
            id: `fabric-swatch-${i}`,
            name: `Swatch ${i}`,
            imageGroups: [{ viewType: 'large', images: [{ link: `/swatch-${i}.webp`, alt: `Swatch ${i}` }] }],
        }));

        render(
            <SwatchGallery
                swatchProducts={manyProducts}
                alreadyOrdered={false}
                initialSelection={[]}
                maxDistinctSwatches={5}
            />
        );

        // Select 5 swatches
        for (let i = 0; i < 5; i++) {
            await user.click(screen.getByRole('checkbox', { name: `Swatch ${i}` }));
        }

        expect(screen.getByText('5 of 5 selected')).toBeInTheDocument();

        // 6th checkbox should be disabled
        const sixthCheckbox = screen.getByRole('checkbox', { name: 'Swatch 5' });
        expect(sixthCheckbox).toBeDisabled();
    });

    test('shows already-ordered state', () => {
        render(
            <SwatchGallery
                swatchProducts={mockSwatchProducts}
                alreadyOrdered={true}
                initialSelection={[]}
                maxDistinctSwatches={5}
            />
        );

        expect(screen.getByText('Swatches ordered')).toBeInTheDocument();
        expect(
            screen.getByText(
                "You've already ordered your free fabric swatches. Check your email for shipping confirmation."
            )
        ).toBeInTheDocument();
        expect(screen.queryByText('Order Free Swatches')).not.toBeInTheDocument();
    });

    test('initializes selection from basket', () => {
        render(
            <SwatchGallery
                swatchProducts={mockSwatchProducts}
                alreadyOrdered={false}
                initialSelection={['fabric-swatch-slate-linen', 'fabric-swatch-navy-velvet']}
                maxDistinctSwatches={5}
            />
        );

        expect(screen.getByText('2 of 5 selected')).toBeInTheDocument();
        expect(screen.getByRole('checkbox', { name: 'Slate Gray, Linen' })).toHaveAttribute('aria-checked', 'true');
        expect(screen.getByRole('checkbox', { name: 'Navy, Velvet' })).toHaveAttribute('aria-checked', 'true');
    });
});
