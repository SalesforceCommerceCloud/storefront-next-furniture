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

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProductBottomBar from './product-bottom-bar';
import type { ShopperProducts } from '@/scapi';
import type { AdditionalItem } from '@/components/product-cart-actions';

// Mutable context returned by useProductView — each test tweaks fields to drive the two CTA states
// (Add to Cart vs "Choose Options").
const mockProductView = {
    handleAddToCart: vi.fn(),
    handleProductSetAddToCart: vi.fn(),
    handleUpdateCart: vi.fn(),
    handleAddToWishlist: vi.fn(),
    isAddingToOrUpdatingCart: false,
    canAddToCart: true,
    currentVariant: { productId: 'variant-1' } as ShopperProducts.schemas['Variant'] | null,
    quantity: 1,
    isMasterOrVariantProduct: false,
    mode: 'add' as const,
};

// Mutable shared add-ons context (from ServiceAddonsProvider).
const mockAddons: { additionalItems: AdditionalItem[]; setAdditionalItems: ReturnType<typeof vi.fn> } = {
    additionalItems: [],
    setAdditionalItems: vi.fn(),
};

vi.mock('@/hooks/product/use-product-images', () => ({
    useProductImages: vi.fn(() => ({
        galleryImages: [{ src: 'https://example.com/image.jpg', alt: 'Test Product' }],
    })),
}));

vi.mock('@/hooks/product/use-selected-variations', () => ({
    useSelectedVariations: vi.fn(() => ({})),
}));

vi.mock('@/lib/product/product-utils', () => ({
    isProductSet: vi.fn(() => false),
    isProductBundle: vi.fn(() => false),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                addToCart: 'Add to Cart',
                addingToCart: 'Adding to Cart...',
                chooseOptions: 'Choose Options',
            };
            return translations[key] || key;
        },
        i18n: { language: 'en-GB' },
    }),
}));

vi.mock('@/components/dynamic-image', () => ({
    DynamicImage: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
        <img src={src} alt={alt} className={className} />
    ),
}));

vi.mock('@/components/product-price', () => ({
    default: ({ product }: { product: ShopperProducts.schemas['Product'] }) => (
        <span data-testid="price">{product.price}</span>
    ),
}));

vi.mock('@/providers/product-view', () => ({
    default: ({ children }: { children: React.ReactNode }) => children,
    useProductView: () => mockProductView,
}));

vi.mock('../context/service-addons-context', () => ({
    useOptionalServiceAddons: () => mockAddons,
}));

const mockProduct: ShopperProducts.schemas['Product'] = {
    id: 'furniture-product',
    name: 'Linen Sofa',
    currency: 'GBP',
    price: 1299,
    imageGroups: [{ viewType: 'large', images: [{ link: 'https://example.com/image.jpg', alt: 'Linen Sofa' }] }],
};

// Build a fake swatch container with two spaced children so scrollToFirstVariant's gap math runs.
const makeSwatchContainer = () => {
    const rect = (top: number, bottom: number) => (): DOMRect =>
        ({
            top,
            bottom,
            left: 0,
            right: 0,
            height: bottom - top,
            width: 0,
            x: 0,
            y: top,
            toJSON: () => ({}),
        }) as DOMRect;
    const container = document.createElement('div');
    const first = document.createElement('div');
    const second = document.createElement('div');
    first.getBoundingClientRect = rect(100, 140);
    second.getBoundingClientRect = rect(160, 200);
    container.appendChild(first);
    container.appendChild(second);
    container.getBoundingClientRect = rect(100, 260);
    return container;
};

describe('ProductBottomBar (furniture)', () => {
    let intersectionObserverCallback: IntersectionObserverCallback;
    let mockObserve: ReturnType<typeof vi.fn>;
    let mockDisconnect: ReturnType<typeof vi.fn>;
    let querySelectorSpy: ReturnType<typeof vi.fn>;
    let swatchContainer: HTMLElement;

    beforeEach(() => {
        // Reset the provider context to the "variant resolved" default (Add to Cart mode).
        mockProductView.handleAddToCart = vi.fn();
        mockProductView.handleProductSetAddToCart = vi.fn();
        mockProductView.isAddingToOrUpdatingCart = false;
        mockProductView.canAddToCart = true;
        mockProductView.currentVariant = { productId: 'variant-1' } as ShopperProducts.schemas['Variant'];
        mockProductView.quantity = 1;
        mockProductView.isMasterOrVariantProduct = false;
        mockAddons.additionalItems = [];

        mockObserve = vi.fn();
        mockDisconnect = vi.fn();
        global.IntersectionObserver = class {
            constructor(callback: IntersectionObserverCallback) {
                intersectionObserverCallback = callback;
            }
            observe = mockObserve;
            disconnect = mockDisconnect;
            unobserve = vi.fn();
            takeRecords = vi.fn();
            root = null;
            rootMargin = '';
            thresholds = [];
        } as unknown as typeof IntersectionObserver;

        swatchContainer = makeSwatchContainer();
        querySelectorSpy = vi.fn((selector: string) => {
            if (selector === '[data-slot="add-to-cart-button"]') {
                return document.createElement('button');
            }
            if (selector === '[data-slot="swatch-container"]') {
                return swatchContainer;
            }
            return null;
        });
        document.querySelector = querySelectorSpy as unknown as typeof document.querySelector;

        window.scrollTo = vi.fn();
        document.documentElement.style.scrollPaddingTop = '';
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        test('renders product name and Add to Cart button', () => {
            render(<ProductBottomBar product={mockProduct} />);
            expect(screen.getByText('Linen Sofa')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
        });

        test('has the product-bottom-bar slot, initially hidden', () => {
            const { container } = render(<ProductBottomBar product={mockProduct} />);
            const bar = container.querySelector('[data-slot="product-bottom-bar"]');
            expect(bar).toBeInTheDocument();
            expect(bar).toHaveClass('translate-y-full');
        });

        test('stays hidden on first navigation when the anchor is below the fold', () => {
            const { container } = render(<ProductBottomBar product={mockProduct} />);
            act(() => {
                // Anchor not intersecting because it is BELOW the viewport (top > 0) — page just loaded.
                intersectionObserverCallback(
                    [{ isIntersecting: false, boundingClientRect: { top: 500 } } as IntersectionObserverEntry],
                    {} as IntersectionObserver
                );
            });
            const bar = container.querySelector('[data-slot="product-bottom-bar"]');
            expect(bar).toHaveClass('translate-y-full');
            expect(bar).not.toHaveClass('translate-y-0');
        });

        test('shows once the anchor has scrolled above the viewport', () => {
            const { container } = render(<ProductBottomBar product={mockProduct} />);
            act(() => {
                intersectionObserverCallback(
                    [{ isIntersecting: false, boundingClientRect: { top: -120 } } as IntersectionObserverEntry],
                    {} as IntersectionObserver
                );
            });
            const bar = container.querySelector('[data-slot="product-bottom-bar"]');
            expect(bar).toHaveClass('translate-y-0');
            expect(bar).not.toHaveClass('translate-y-full');
        });

        test('is inert while hidden and interactive once visible', () => {
            const { container } = render(<ProductBottomBar product={mockProduct} />);
            const bar = container.querySelector('[data-slot="product-bottom-bar"]');
            // Hidden on first render → removed from the tab order and the a11y tree so keyboard/AT
            // users can't reach the off-screen CTA.
            expect(bar).toHaveAttribute('inert');
            act(() => {
                intersectionObserverCallback(
                    [{ isIntersecting: false, boundingClientRect: { top: -120 } } as IntersectionObserverEntry],
                    {} as IntersectionObserver
                );
            });
            // Visible → interactive again.
            expect(bar).not.toHaveAttribute('inert');
        });

        test('hides again when the anchor scrolls back into view', () => {
            const { container } = render(<ProductBottomBar product={mockProduct} />);
            act(() => {
                intersectionObserverCallback(
                    [{ isIntersecting: false, boundingClientRect: { top: -120 } } as IntersectionObserverEntry],
                    {} as IntersectionObserver
                );
            });
            act(() => {
                intersectionObserverCallback(
                    [{ isIntersecting: true, boundingClientRect: { top: 40 } } as IntersectionObserverEntry],
                    {} as IntersectionObserver
                );
            });
            const bar = container.querySelector('[data-slot="product-bottom-bar"]');
            expect(bar).toHaveClass('translate-y-full');
        });
    });

    describe('Add to Cart', () => {
        test('with no add-ons, clicking calls handleAddToCart', () => {
            render(<ProductBottomBar product={mockProduct} />);
            fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
            expect(mockProductView.handleAddToCart).toHaveBeenCalledTimes(1);
            expect(mockProductView.handleProductSetAddToCart).not.toHaveBeenCalled();
        });

        test('with add-ons, clicking batches them via handleProductSetAddToCart', () => {
            mockAddons.additionalItems = [{ productId: 'svc-assembly', quantity: 1, price: 99 }];
            render(<ProductBottomBar product={mockProduct} />);
            fireEvent.click(screen.getByRole('button', { name: /add to cart/i }));
            expect(mockProductView.handleAddToCart).not.toHaveBeenCalled();
            expect(mockProductView.handleProductSetAddToCart).toHaveBeenCalledTimes(1);
            const batch = mockProductView.handleProductSetAddToCart.mock.calls[0][0];
            expect(batch).toHaveLength(2);
            expect(batch[0]).toMatchObject({ product: mockProduct, quantity: 1 });
            expect(batch[1]).toMatchObject({ product: { id: 'svc-assembly', price: 99 }, quantity: 1 });
        });

        test('observes the add-to-cart button when a variant is resolved', () => {
            render(<ProductBottomBar product={mockProduct} />);
            expect(querySelectorSpy).toHaveBeenCalledWith('[data-slot="add-to-cart-button"]');
            expect(querySelectorSpy).not.toHaveBeenCalledWith('[data-slot="swatch-container"]');
            expect(mockObserve).toHaveBeenCalled();
        });
    });

    describe('Choose Options (variant not resolved)', () => {
        beforeEach(() => {
            mockProductView.isMasterOrVariantProduct = true;
            mockProductView.currentVariant = null;
            mockProductView.canAddToCart = false;
        });

        test('renders an enabled "Choose Options" button', () => {
            render(<ProductBottomBar product={mockProduct} />);
            const button = screen.getByRole('button', { name: /choose options/i });
            expect(button).toBeInTheDocument();
            expect(button).not.toBeDisabled();
        });

        test('observes the swatch container instead of the add-to-cart button', () => {
            render(<ProductBottomBar product={mockProduct} />);
            expect(querySelectorSpy).toHaveBeenCalledWith('[data-slot="swatch-container"]');
            expect(querySelectorSpy).not.toHaveBeenCalledWith('[data-slot="add-to-cart-button"]');
            expect(mockObserve).toHaveBeenCalled();
        });

        test('clicking scrolls the first variant into view (does not add to cart)', () => {
            render(<ProductBottomBar product={mockProduct} />);
            fireEvent.click(screen.getByRole('button', { name: /choose options/i }));
            expect(mockProductView.handleAddToCart).not.toHaveBeenCalled();
            expect(mockProductView.handleProductSetAddToCart).not.toHaveBeenCalled();
            // gap = second.top(160) - first.bottom(140) = 20; no header offset; target = first.top(100); top = 100 - 0 - 20 = 80
            expect(window.scrollTo).toHaveBeenCalledWith({ top: 80, behavior: 'smooth' });
        });

        test('moves focus to the first variant control after scrolling', () => {
            // Give the swatch container a real focusable control (the roving-tabindex tabstop) and
            // attach it to the document so focus() takes effect in jsdom.
            const swatch = document.createElement('button');
            swatch.textContent = 'Oak';
            swatchContainer.insertBefore(swatch, swatchContainer.firstChild);
            document.body.appendChild(swatchContainer);

            render(<ProductBottomBar product={mockProduct} />);
            fireEvent.click(screen.getByRole('button', { name: /choose options/i }));

            // Keyboard/AT users land on the selector instead of the CTA that slides off-screen.
            expect(document.activeElement).toBe(swatch);

            document.body.removeChild(swatchContainer);
        });

        test('offsets the scroll by the sticky-header height (scroll-padding-top)', () => {
            document.documentElement.style.scrollPaddingTop = '40px';
            render(<ProductBottomBar product={mockProduct} />);
            fireEvent.click(screen.getByRole('button', { name: /choose options/i }));
            // top = first.top(100) - headerOffset(40) - gap(20) = 40 → below the sticky header
            expect(window.scrollTo).toHaveBeenCalledWith({ top: 40, behavior: 'smooth' });
        });
    });

    describe('Selection-aware re-attach', () => {
        test('re-attaches the observer to the other anchor when selection state flips', () => {
            const { rerender } = render(<ProductBottomBar product={mockProduct} />);
            expect(querySelectorSpy).toHaveBeenCalledWith('[data-slot="add-to-cart-button"]');
            const disconnectsBefore = mockDisconnect.mock.calls.length;

            // Shopper "clears" the selection → the bar should re-key to the swatch container.
            mockProductView.isMasterOrVariantProduct = true;
            mockProductView.currentVariant = null;
            rerender(<ProductBottomBar product={mockProduct} />);

            expect(mockDisconnect.mock.calls.length).toBeGreaterThan(disconnectsBefore);
            expect(querySelectorSpy).toHaveBeenCalledWith('[data-slot="swatch-container"]');
        });
    });

    describe('Cleanup', () => {
        test('disconnects observer on unmount', () => {
            const { unmount } = render(<ProductBottomBar product={mockProduct} />);
            unmount();
            expect(mockDisconnect).toHaveBeenCalled();
        });
    });
});
