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
import type { LoaderFunctionArgs } from 'react-router';
import type { ShopperProducts, ShopperSearch } from '@/scapi';
import type { Recommendation } from '@/hooks/recommenders/use-recommenders';
import { fetchCarouselProducts } from '@/components/product-carousel/loaders';
import { siteContext, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';

/** Wide enough candidate pool to survive self-exclusion + style filtering without a second round-trip. */
const CANDIDATE_POOL_SIZE = 48;

/**
 * The set of product ids that mean "this is the product on the current PDP": the current
 * variant's own sku (`product.id`) plus its master sku (`product.master?.masterId`), plus any
 * represented-product ids. Mirrors footwear's identity logic.
 */
function currentProductIdentity(product: ShopperProducts.schemas['Product']): Set<string> {
    const ids = new Set<string>();
    if (product.id) ids.add(product.id);
    const masterId = product.master?.masterId;
    if (masterId) ids.add(masterId);
    const repProducts = product.representedProducts;
    if (Array.isArray(repProducts)) {
        for (const rep of repProducts) {
            if (rep?.id) ids.add(rep.id);
        }
    }
    return ids;
}

/**
 * Every product id a search hit can carry back to a concrete product: its own `productId`, any
 * represented-product ids, and the skus of its variants and variation groups. Mirrors footwear's
 * hit-identity logic.
 */
function isCurrentProduct(hit: ShopperSearch.schemas['ProductSearchHit'], identity: Set<string>): boolean {
    if (identity.has(hit.productId)) return true;
    if (hit.representedProduct?.id && identity.has(hit.representedProduct.id)) return true;
    if ((hit.representedProducts ?? []).some((rep) => rep?.id != null && identity.has(rep.id))) return true;
    if ((hit.variants ?? []).some((variant) => variant?.productId != null && identity.has(variant.productId)))
        return true;
    return (hit.variationGroups ?? []).some((group) => group?.productId != null && identity.has(group.productId));
}

/**
 * Fetches the shared candidate pool that feeds both furniture PDP rails in a single SCAPI search:
 * other products in the current product's room category (Living Room / Bedroom / Dining Room / …).
 * The loader resolves this once and derives both "You Might Also Like" and "Complete the Room"
 * from the resolved hits, so the category search runs once per PDP rather than once per rail.
 * Returns an empty pool when the product has no room, and an empty pool when the search fails, so
 * both rails degrade to nothing rather than surfacing an error.
 */
export async function fetchRoomCandidatePool(
    context: LoaderFunctionArgs['context'],
    product: ShopperProducts.schemas['Product']
): Promise<ShopperSearch.schemas['ProductSearchHit'][]> {
    // The room is either the primary category (most common) or the c_room custom attribute (fallback).
    const roomCategoryId =
        product.primaryCategory?.id ?? ((product as Record<string, unknown>).c_room as string | undefined);
    if (!roomCategoryId) return [];

    const { currency } = context.get(siteContext) as SiteContext;
    const result = await fetchCarouselProducts(context, {
        categoryId: roomCategoryId,
        limit: CANDIDATE_POOL_SIZE,
        currency: currency ?? undefined,
    }).catch(() => null);

    return result?.hits ?? [];
}

/**
 * "You Might Also Like" rail: other products from the shared room pool, preferring same-style
 * matches (hits whose `c_style` matches the current product's `c_style`), then backfilling with
 * the rest of the pool if needed to reach the limit. Excludes the current product.
 * Pure derivation over an already-resolved pool — see {@link fetchRoomCandidatePool}.
 */
export function deriveYouMightAlsoLike(
    hits: ShopperSearch.schemas['ProductSearchHit'][],
    product: ShopperProducts.schemas['Product'],
    limit = 12
): Recommendation {
    const identity = currentProductIdentity(product);
    const productStyle = (product as Record<string, unknown>).c_style as string | undefined;

    // Exclude self from the pool.
    const pool = hits.filter((hit) => !isCurrentProduct(hit, identity));

    // Prefer hits that share the product's c_style (e.g. "Modern", "Traditional").
    const sameStyle = productStyle
        ? pool.filter((hit) => (hit as Record<string, unknown>).c_style === productStyle)
        : [];

    // Take as many same-style hits as we can, then backfill with the rest if needed.
    const recs = [...sameStyle.slice(0, limit), ...pool.filter((hit) => !sameStyle.includes(hit))].slice(0, limit);

    return recs.length ? { recs } : {};
}

/**
 * "Complete the Room" rail: the remainder of the room pool MINUS the products already chosen
 * by "You Might Also Like", so the two rails surface distinct, non-overlapping sets. Excludes
 * the current product. Pure derivation — see {@link fetchRoomCandidatePool}.
 */
export function deriveCompleteTheRoom(
    hits: ShopperSearch.schemas['ProductSearchHit'][],
    product: ShopperProducts.schemas['Product'],
    limit = 12
): Recommendation {
    const identity = currentProductIdentity(product);

    // First, compute "You Might Also Like" to get its chosen ids.
    const alsoLike = deriveYouMightAlsoLike(hits, product, limit);
    const alsoLikeIds = new Set((alsoLike.recs ?? []).map((hit) => hit.productId));

    // "Complete the Room" = self-excluded pool MINUS the also-like ids.
    const pool = hits
        .filter((hit) => !isCurrentProduct(hit, identity))
        .filter((hit) => !alsoLikeIds.has(hit.productId));

    const recs = pool.slice(0, limit);
    return recs.length ? { recs } : {};
}
