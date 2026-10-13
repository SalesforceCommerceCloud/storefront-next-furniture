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
import type { Route } from './+types/_app.swatches';
import { redirect } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { ShopperProducts } from '@/scapi';
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { buildUrlFromContext } from '@/lib/url.server';
import { routes } from '@/route-paths';
import SwatchGallery from '@/components/swatch-gallery';
import { getAuth } from '@/middlewares/auth.server';
import { fetchProductsByIds } from '@/lib/api/products.server';
import { fetchSearchProducts } from '@/lib/api/search.server';
import { getCustomerProfileForCheckout } from '@/lib/api/customer.server';
import { getBasket } from '@/middlewares/basket.server';
import { uiConfig } from '@/lib/config.ui';

export type SwatchesPageData = {
    pageUrl: string;
    swatchProducts: ShopperProducts.schemas['Product'][];
    alreadyOrdered: boolean;
    initialSelection: string[];
    maxDistinctSwatches: number;
};

export async function loader({ request, context }: Route.LoaderArgs): Promise<SwatchesPageData> {
    const url = new URL(request.url);

    // Login gate: redirect to login if not a registered user
    const session = getAuth(context);
    if (session.userType !== 'registered' || !session.customerId) {
        throw redirect(buildUrlFromContext(`${routes.login}?returnUrl=/swatches`, context));
    }

    // Fetch swatch products from the fabric-swatches category (searchable but flagged c_hideFromSearchResults)
    const searchResult = await fetchSearchProducts(
        context,
        { refine: ['cgid=fabric-swatches'] },
        { includeSearchHidden: true }
    );
    const swatchProductIds = (searchResult.hits?.map((hit) => hit.productId).filter(Boolean) ?? []) as string[];

    // Hydrate full product details (images + c_fabricFamily)
    const swatchProducts =
        swatchProductIds.length > 0
            ? await fetchProductsByIds(context, swatchProductIds, {
                  expand: ['images', 'availability', 'prices'],
              })
            : [];

    // Concurrent reads: profile and basket don't depend on product hydration
    const [customerProfile, basketResource] = await Promise.all([
        getCustomerProfileForCheckout(context, session.customerId),
        getBasket(context),
    ]);
    const alreadyOrdered = Boolean(
        (customerProfile?.customer as { c_swatchSetClaimedAt?: string })?.c_swatchSetClaimedAt
    );

    // Get current basket to initialize selection from existing swatch lines (regular $0 lines now, not bonus)
    const basket = basketResource.current;
    const initialSelection: string[] = [];

    if (basket?.productItems) {
        const swatchIdSet = new Set(swatchProductIds);
        for (const item of basket.productItems) {
            if (item.productId && swatchIdSet.has(item.productId)) {
                initialSelection.push(item.productId);
            }
        }
    }

    return {
        pageUrl: buildCanonicalUrl(url.origin, url.pathname, url.search),
        swatchProducts,
        alreadyOrdered,
        initialSelection,
        maxDistinctSwatches: uiConfig.pages.swatches.maxDistinctSwatches,
    };
}

export default function SwatchesPage({ loaderData }: Route.ComponentProps) {
    const { t } = useTranslation('swatches');
    return (
        <div className="section-container py-10 md:py-14">
            <SeoMeta
                title={t('meta.title')}
                description={t('meta.description')}
                openGraph={{ url: loaderData.pageUrl }}
            />
            <div className="mx-auto max-w-5xl space-y-8">
                <div className="max-w-2xl space-y-2">
                    <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
                        {t('title')}
                    </h1>
                    <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{t('description')}</p>
                </div>
                <SwatchGallery
                    swatchProducts={loaderData.swatchProducts}
                    alreadyOrdered={loaderData.alreadyOrdered}
                    initialSelection={loaderData.initialSelection}
                    maxDistinctSwatches={loaderData.maxDistinctSwatches}
                />
            </div>
        </div>
    );
}
