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

import { type ReactElement, useState, useEffect } from 'react';
import type { ShopperProducts } from '@/scapi';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useProductView } from '@/providers/product-view';
import { useProductImages } from '@/hooks/product/use-product-images';
import { useSelectedVariations } from '@/hooks/product/use-selected-variations';
import { isProductSet, isProductBundle } from '@/lib/product/product-utils';
import { addToCartWithAddons } from '@/lib/product/add-to-cart-with-addons';
import { useOptionalServiceAddons } from '../context/service-addons-context';
import ProductPrice from '@/components/product-price';
import { DynamicImage } from '@/components/dynamic-image';
import { useTranslation } from 'react-i18next';

interface ProductBottomBarProps {
    product: ShopperProducts.schemas['Product'];
}

// Elements a keyboard user can Tab to. Roving-tabindex swatch groups expose their active tile as
// tabindex="0" (the rest are -1), so this lands focus on the group's real tabstop rather than a
// hidden sibling swatch.
const FOCUSABLE_CONTROL_SELECTOR = [
    'a[href]',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex="0"]',
].join(', ');

/**
 * Sticky bottom bar for the furniture PDP: product image, price, and a purchase action that slides
 * up when the shopper scrolls past the relevant anchor. Furniture vertical only.
 *
 * Mounted at the ROUTE level (a sibling of the main product content, inside an outer
 * `ProductViewProvider`) so its `fixed` positioning is viewport-relative — mounting it inside
 * `ProductView`'s content flow makes it render clipped. Selected service add-ons are read from the
 * shared `ServiceAddonsProvider`, so its Add-to-Cart batches the same items as the main button.
 *
 * Behaviour depends on whether the shopper has resolved a single variant:
 * - Variant not yet resolved: the CTA reads "Choose Options", stays enabled, and scrolls the first
 *   variant attribute into view. The bar surfaces once the swatch container
 *   (`[data-slot="swatch-container"]`) scrolls above the viewport.
 * - Variant resolved (or the product has no variants): the CTA is Add to Cart, and the bar surfaces
 *   once the main Add-to-Cart button (`[data-slot="add-to-cart-button"]`) scrolls above the viewport.
 */
export default function ProductBottomBar({ product }: ProductBottomBarProps): ReactElement {
    const { t } = useTranslation('product');
    const [isVisible, setIsVisible] = useState(false);
    const selectedAttributes = useSelectedVariations({ product });
    const { galleryImages } = useProductImages({ product, selectedAttributes });
    const additionalItems = useOptionalServiceAddons()?.additionalItems ?? [];

    // Shared with the main ProductCartActions button via the one route-level ProductViewProvider
    // (furniture ProductView reuses it rather than nesting its own), so quantity, price, canAddToCart,
    // and the resolved variant can never disagree.
    const {
        handleAddToCart,
        handleProductSetAddToCart,
        isAddingToOrUpdatingCart,
        canAddToCart,
        currentVariant,
        quantity,
        isMasterOrVariantProduct,
    } = useProductView();

    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);

    // Same gate ProductCartActions uses for its "select all options" message: the product has
    // variants but the shopper hasn't narrowed the selection down to a single variant yet.
    const needsVariantSelection = isMasterOrVariantProduct && !currentVariant && !isProductASet && !isProductABundle;

    const primaryImage = galleryImages[0];

    // Track the relevant anchor's visibility. Choose Options gates first: while the selection is
    // incomplete the bar is tied to the swatch container (so it surfaces once the shopper scrolls
    // past the selectors, regardless of the Add-to-Cart button); once a variant resolves it tracks
    // the main Add-to-Cart button. Depends on `needsVariantSelection` so the observer disconnects and
    // re-attaches to the correct anchor when the selection completes/reverts.
    useEffect(() => {
        const anchorSelector = needsVariantSelection
            ? '[data-slot="swatch-container"]'
            : '[data-slot="add-to-cart-button"]';
        const anchor = document.querySelector(anchorSelector);
        // No anchor yet → keep the bar hidden (its default state), matching a freshly navigated page.
        if (!anchor) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show the bar only once the anchor has scrolled ABOVE the top of the viewport (the
                // shopper scrolled past it). The `top < 0` guard keeps it hidden on first navigation,
                // when the anchor is still in view or below the fold.
                setIsVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
            },
            { threshold: 0 }
        );

        observer.observe(anchor);

        return () => {
            observer.disconnect();
        };
    }, [needsVariantSelection]);

    // Scroll the first variant attribute to just below the top of the viewport, offset by the same
    // vertical gap used between the variant attributes (furniture stacks them in a space-y-3
    // container). The gap is read from the live layout so it tracks the real spacing.
    const scrollToFirstVariant = () => {
        const container = document.querySelector('[data-slot="swatch-container"]');
        if (!container) return;
        const first = container.firstElementChild;
        const second = container.children[1];
        const gap =
            first && second
                ? Math.max(0, second.getBoundingClientRect().top - first.getBoundingClientRect().bottom)
                : 12; // fallback = space-y-3 (0.75rem)
        // The header is sticky, so land the first attribute below it: offset by scroll-padding-top
        // (the header height the layout already tracks via --header-height) plus the inter-attribute
        // gap. Without the header offset the attribute scrolls under the header and looks clipped.
        const headerOffset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
        const target = first ?? container;
        const top = window.scrollY + target.getBoundingClientRect().top - headerOffset - gap;
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });

        // Move focus to the first variant control so keyboard/AT users land on the selector rather
        // than being stranded on the CTA, which slides off-screen once the swatches scroll into view.
        // `preventScroll` keeps the header-aware smooth scroll above from being overridden by the
        // browser's default focus scroll.
        container.querySelector<HTMLElement>(FOCUSABLE_CONTROL_SELECTOR)?.focus({ preventScroll: true });
    };

    // Add to cart, batching any selected service add-ons — shared with ProductCartActions's main
    // button via addToCartWithAddons so the two can't drift.
    const addToCart = () =>
        addToCartWithAddons({
            product,
            currentVariant,
            quantity,
            additionalItems,
            handleAddToCart,
            handleProductSetAddToCart,
        });

    const buttonLabel = needsVariantSelection
        ? t('chooseOptions')
        : isAddingToOrUpdatingCart
          ? t('addingToCart')
          : t('addToCart');

    return (
        <div
            data-slot="product-bottom-bar"
            // Hidden is a visual translate only; without `inert` the CTA would stay in the tab order
            // and the a11y tree while off-screen, so keyboard/AT users could reach an invisible control
            // and a second "Add to Cart" would be announced. `inert` removes the hidden bar from both.
            inert={!isVisible ? true : undefined}
            className={cn(
                'fixed bottom-0 left-0 right-0 z-40',
                'border-t border-border bg-card',
                'shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]',
                'transition-transform duration-200 ease-out',
                isVisible ? 'translate-y-0' : 'translate-y-full'
            )}
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="section-container py-3">
                <div className="flex items-center gap-3 md:gap-6">
                    {/* Product Image - Hidden on mobile */}
                    {primaryImage && (
                        <DynamicImage
                            src={primaryImage.src}
                            alt={primaryImage.alt || product.name}
                            className="hidden md:block h-12 w-12 rounded-ui object-cover border border-border"
                            widths={[48]}
                            loading="lazy"
                        />
                    )}

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                        <div className="text-sm text-muted-foreground">
                            <ProductPrice
                                product={product}
                                currency={product.currency || 'USD'}
                                currentPriceProps={{ className: 'text-sm' }}
                            />
                        </div>
                    </div>

                    {/* Add to Cart / Choose Options — matches canonical button styling exactly */}
                    <Button
                        onClick={() => {
                            if (needsVariantSelection) {
                                scrollToFirstVariant();
                            } else {
                                void addToCart();
                            }
                        }}
                        disabled={needsVariantSelection ? false : !canAddToCart || isAddingToOrUpdatingCart}
                        size="lg"
                        className="text-base font-semibold leading-6 shrink-0 min-w-[140px] md:min-w-[200px]">
                        {buttonLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
