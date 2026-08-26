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
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopperProducts } from '@/scapi';
import { cn } from '@/lib/utils';
import { getProductDimensions, formatProductDimensions } from '../../lib/dimension-format';
import { getShippingEstimate } from '../../lib/shipping-estimate';

interface CartLineFulfillmentInfoProps {
    product: ShopperProducts.schemas['Product'] | undefined | null;
    className?: string;
}

/**
 * Fills the `sfcc.cart.shipping.deliveryEstimate` / `sfcc.miniCart.shipping.deliveryEstimate`
 * UITarget slots with a compact W x D x H plus lead-time readout for a furniture cart line item.
 * Renders nothing when the product carries neither dimension nor shipping custom attributes.
 */
export default function CartLineFulfillmentInfo({
    product,
    className,
}: CartLineFulfillmentInfoProps): ReactElement | null {
    const { t } = useTranslation('product');
    const dimensionsText = formatProductDimensions(getProductDimensions(product));
    const estimate = getShippingEstimate(product);

    let shippingText: string | null = null;
    if (estimate?.quickShip) {
        shippingText = t('furnitureSpec.shipsQuickly');
    } else if (estimate?.leadTimeDays !== undefined) {
        shippingText =
            estimate.leadTimeDays === 1
                ? t('furnitureSpec.shipsInOneDay')
                : t('furnitureSpec.shipsInDays', { count: estimate.leadTimeDays });
    }

    if (!dimensionsText && !shippingText) return null;

    return (
        <div
            data-slot="cart-line-fulfillment-info"
            className={cn('text-right text-xs text-muted-foreground', className)}>
            {dimensionsText && <p>{dimensionsText}</p>}
            {shippingText && <p>{shippingText}</p>}
        </div>
    );
}
