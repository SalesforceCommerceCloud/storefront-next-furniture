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
import ImageGallery from '@/components/image-gallery';
import ProductInfo from '@/components/product-view/product-info';
import ProductCartActions, { type AdditionalItem } from '@/components/product-cart-actions';
import ConfigurationSummary from './configuration-summary';
import HowToGetIt from './how-to-get-it';
import AvailableServices from './available-services';
import type { ServiceAddon } from '../../lib/service-addons.server';
import { useOptionalServiceAddons } from '../../context/service-addons-context';
import ProductViewProvider, { useOptionalProductView } from '@/providers/product-view';
import { useProductImages } from '@/hooks/product/use-product-images';
import { useSelectedVariations } from '@/hooks/product/use-selected-variations';
import { isProductSet, isProductBundle } from '@/lib/product/product-utils';
import { uiConfig } from '@/lib/config.ui';
import CollapsibleHtmlSection from '@/components/collapsible-section/collapsible-html-section';
import { useTranslation } from 'react-i18next';
import { UITarget } from '@/targets/ui-target';

interface ProductViewProps {
    product: ShopperProducts.schemas['Product'];
    mode?: 'add' | 'edit';
    /** Deferred catalog-resolved add-on services (from the furniture PDP loader). */
    serviceAddonsPromise?: Promise<ServiceAddon[]>;
}

/**
 * Furniture ProductView overlay: renders the baseline product view plus "Your Configuration"
 * summary and "Available services" when service add-ons are provided. Owns the selected-services
 * state and passes it as additionalItems to ProductCartActions, so the furniture loader can
 * control service availability without touching the canonical ProductCartActions component.
 */
export default function ProductView({ product, serviceAddonsPromise }: ProductViewProps): ReactElement {
    // Selected service add-ons are shared with the route-level ProductBottomBar via
    // ServiceAddonsProvider so both batch the same items into Add-to-Cart. When ProductView renders
    // outside that provider (tests/Storybook), fall back to local state so it stays self-contained.
    const sharedAddons = useOptionalServiceAddons();
    const [localAdditionalItems, setLocalAdditionalItems] = useState<AdditionalItem[]>([]);
    const additionalItems = sharedAddons?.additionalItems ?? localAdditionalItems;
    const setAdditionalItems = sharedAddons?.setAdditionalItems ?? setLocalAdditionalItems;

    // The furniture PDP route mounts a ProductViewProvider around both this view and the sticky
    // ProductBottomBar, so the bar can share add-to-cart state. Reuse that outer provider when
    // present so the in-page quantity picker and the bar read/write ONE quantity (and variant)
    // state — a nested provider here would fork it, leaving the bar stuck on quantity 1. Standalone
    // renders (Storybook / tests) have no outer provider, so fall back to our own.
    const hasOuterProvider = Boolean(useOptionalProductView());

    // Reset the local fallback when navigating to a different product; when the shared provider is
    // present it owns the reset (keyed by product id) instead.
    useEffect(() => {
        if (!sharedAddons) setLocalAdditionalItems([]);
    }, [product.id, sharedAddons]);

    // Calculate directly without useMemo since these are simple operations
    const isProductASet = isProductSet(product);
    const isProductABundle = isProductBundle(product);

    // Get selected attributes from URL parameters for image gallery
    const selectedAttributes = useSelectedVariations({ product });
    const { galleryImages } = useProductImages({
        product,
        selectedAttributes,
    });

    const { t } = useTranslation('product');

    // Furniture opts into the mosaic PDP gallery via config; every other vertical stays 'stacked'
    // (hero + thumbnails). Read here (the PDP caller) so non-PDP ImageGallery usages are unaffected.
    const galleryLayout = uiConfig.pages.product.galleryLayout ?? 'stacked';

    const content = (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-12">
            {/* Left Column - Image Gallery + Description */}
            <div className="order-1">
                <ImageGallery
                    key={product.id}
                    images={galleryImages}
                    eager={!isProductASet && !isProductABundle}
                    showNavigationArrows
                    navigationArrowSize="lg"
                    productName={product.name}
                    layout={galleryLayout}
                />
                <UITarget targetId="sfcc.pdp.agent.productHelper" />
                {product.longDescription && product.longDescription !== product.shortDescription && (
                    <CollapsibleHtmlSection
                        label={`${t('description')}:`}
                        content={product.longDescription}
                        contentType="bulleted-list"
                        defaultOpen
                        className="mt-6"
                    />
                )}
            </div>

            {/* Right Column - Product Info */}
            <div className="order-2">
                <ProductInfo
                    product={product}
                    afterVariations={
                        <>
                            <ConfigurationSummary />
                            <HowToGetIt />
                        </>
                    }
                    hideDeliveryOptions
                    showQuantityPicker={false}
                />
                <ProductCartActions product={product} additionalItems={additionalItems} showInlineQuantity />
                {serviceAddonsPromise && (
                    <AvailableServices servicesPromise={serviceAddonsPromise} onSelectionChange={setAdditionalItems} />
                )}
                <UITarget targetId="sfcc.pdp.returnsWarranty" />
                <UITarget targetId="sfcc.pdp.collapsibles" />
            </div>
        </div>
    );

    return hasOuterProvider ? (
        content
    ) : (
        <ProductViewProvider product={product} mode="add">
            {content}
        </ProductViewProvider>
    );
}
