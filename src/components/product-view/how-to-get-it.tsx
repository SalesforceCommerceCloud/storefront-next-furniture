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
import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopperProducts } from '@/scapi';
import { useProductView } from '@/providers/product-view';
import { isProductSet, isProductBundle } from '@/lib/product/product-utils';
import DeliveryOptions from '@/extensions/bopis/components/delivery-options/delivery-options';

/**
 * Furniture "How to get it" section: groups the canonical delivery/pickup experience under a single
 * headed card, arranged vertically. Reuses the canonical DeliveryOptions verbatim (ship/pickup radio,
 * inline ZIP calculator, store-locator drawer) — the furniture layer only wraps and restyles it (the
 * flat stacked-row look comes from the [data-section="how-to-get-it"] rules in the furniture theme).
 *
 * The canonical DeliveryOptions is suppressed inside ProductInfo (via hideDeliveryOptions) so this is
 * the single fulfillment block. Self-gates to match the canonical delivery gate, so the caller doesn't
 * need a conditional.
 */
export default function HowToGetIt(): ReactElement | null {
    const { t } = useTranslation('product');
    const { product, currentVariant, quantity, basketPickupStore, isOutOfStock } = useProductView();

    // Mirror the canonical ProductInfo gate: no delivery block for out-of-stock items, sets, or bundles.
    const suppressed = isOutOfStock || isProductSet(product) || isProductBundle(product);

    // Hydrate delivery inventory checks with the selected variant's inventory while preserving the
    // master id — identical to ProductInfo's productForDeliveryOptions.
    const productForDeliveryOptions = useMemo(() => {
        if (!currentVariant) return product;
        const variantWithInventory = currentVariant as ShopperProducts.schemas['Variant'] & {
            inventory?: ShopperProducts.schemas['Inventory'];
            inventories?: ShopperProducts.schemas['Inventory'][];
        };
        return {
            ...product,
            inventory: variantWithInventory.inventory ?? product.inventory,
            inventories: variantWithInventory.inventories ?? product.inventories,
        };
    }, [product, currentVariant]);

    if (suppressed) return null;

    return (
        <section data-section="how-to-get-it" className="mt-6 overflow-hidden rounded-ui border border-border bg-card">
            <div className="border-b border-border px-4 py-3">
                <h3 className="text-base font-semibold">{t('howToGetIt')}</h3>
            </div>
            <div className="px-4 py-1">
                <DeliveryOptions
                    product={productForDeliveryOptions}
                    quantity={quantity}
                    basketPickupStore={basketPickupStore}
                />
            </div>
        </section>
    );
}
