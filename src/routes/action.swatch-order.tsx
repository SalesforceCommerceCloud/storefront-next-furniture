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
import { data } from 'react-router';
import { BasketAction, createBasketAction } from '@/lib/cart/basket-action.server';
import { createActionError } from '@/lib/action-error-helpers.server';
import { ErrorCode } from '@/lib/error-codes';
import { getAuth } from '@/middlewares/auth.server';
import { getCustomerProfileForCheckout } from '@/lib/api/customer.server';
import { fetchSearchProducts } from '@/lib/api/search.server';
import { uiConfig } from '@/lib/config.ui';

/** Storefront category that holds the orderable fabric swatch products (same source the loader lists). */
const SWATCH_CATEGORY_ID = 'fabric-swatches';

/**
 * Server action to manage the furniture free fabric swatches flow.
 * Adds selected swatches as regular $0 product lines (no bonus mechanism, no placeholder).
 */
export const action = createBasketAction(
    {
        method: 'POST',
        action: BasketAction.SwatchOrder,
        parse: (fd) => {
            const raw = fd.get('selectedProductIds')?.toString() || '[]';
            // Parse defensively. Invalid JSON, or a payload that isn't an array of strings, becomes
            // `null` so the handler's guard rejects it with a 400 — never a silent empty array, which
            // would clear the shopper's existing swatch lines instead of erroring.
            let selectedProductIds: string[] | null = null;
            try {
                const parsed: unknown = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.every((id) => typeof id === 'string')) {
                    selectedProductIds = parsed;
                }
            } catch {
                // leave null → rejected by the Array.isArray guard below
            }
            return { selectedProductIds };
        },
    },
    async ({ input, basketId, basket, clients, logger, context }) => {
        // Guard: registered users only
        const session = getAuth(context);
        if (session.userType !== 'registered') {
            logger.warn('SwatchOrder: guest user attempted swatch order');
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.NOT_AUTHENTICATED,
                        message: 'You must be logged in to order swatches',
                    }),
                },
                { status: 401 }
            );
        }

        const { selectedProductIds } = input;
        const maxSelection = uiConfig.pages.swatches.maxDistinctSwatches;

        // Reject invalid input up front. `selectedProductIds` is null when the payload was not a JSON
        // array of strings (see parse above), so this guard also covers malformed/invalid JSON.
        if (!Array.isArray(selectedProductIds)) {
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.INVALID_INPUT,
                        message: 'selectedProductIds must be an array',
                    }),
                },
                { status: 400 }
            );
        }

        // Resolve the authoritative swatch set from its category (the same source the /swatches loader
        // lists). Validating every requested id against this set means a hand-crafted POST cannot add
        // arbitrary non-swatch products as $0 lines, and it keeps the action decoupled from any
        // product-id naming convention. Shopper Search is a hard dependency here (it identifies the
        // swatch lines to reconcile), so degrade to a clean 503 if it is unavailable rather than an
        // unhandled 500. During such an outage the /swatches page cannot load either, and the shopper
        // can still remove swatch lines via the standard cart remove, which does not touch Search.
        let swatchIdSet: Set<string>;
        try {
            const swatchSearch = await fetchSearchProducts(
                context,
                { refine: [`cgid=${SWATCH_CATEGORY_ID}`] },
                { includeSearchHidden: true }
            );
            swatchIdSet = new Set((swatchSearch.hits?.map((hit) => hit.productId).filter(Boolean) ?? []) as string[]);
        } catch (error) {
            logger.error('SwatchOrder: failed to resolve the swatch catalog', { basketId, error });
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.OPERATION_FAILED,
                        message: 'Swatches are temporarily unavailable. Please try again.',
                    }),
                },
                { status: 503 }
            );
        }

        // Dedupe requested ids: this enforces the one-per-swatch cap (maxQtyPerSwatch), since each
        // distinct swatch is added exactly once at quantity 1 below.
        const requestedIds = [...new Set(selectedProductIds)];

        // Every requested id must be a known swatch.
        const unknownIds = requestedIds.filter((id) => !swatchIdSet.has(id));
        if (unknownIds.length > 0) {
            logger.warn('SwatchOrder: request included non-swatch product ids', { basketId, unknownIds });
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.INVALID_INPUT,
                        message: 'One or more selected products are not valid swatches',
                    }),
                },
                { status: 400 }
            );
        }

        // Enforce max distinct selection (after dedupe).
        if (requestedIds.length > maxSelection) {
            return data(
                {
                    success: false,
                    error: createActionError({
                        code: ErrorCode.INVALID_INPUT,
                        message: `You can select up to ${maxSelection} swatches`,
                    }),
                },
                { status: 400 }
            );
        }

        // Per-shopper limit: block if this authenticated customer already claimed their free set.
        // (The /swatches loader also gates this, but the action must enforce it independently so a
        // direct POST can't bypass the one-order-per-shopper limit.) Only blocks adds; an empty
        // selection still passes through so a claimed shopper can clear a stale in-progress basket.
        if (requestedIds.length > 0 && session.customerId) {
            const profile = await getCustomerProfileForCheckout(context, session.customerId);
            const alreadyClaimed = Boolean(
                (profile?.customer as { c_swatchSetClaimedAt?: string } | undefined)?.c_swatchSetClaimedAt
            );
            if (alreadyClaimed) {
                logger.warn('SwatchOrder: customer already claimed their free swatches', { basketId });
                return data(
                    {
                        success: false,
                        error: createActionError({
                            code: ErrorCode.OPERATION_FAILED,
                            message: 'You have already ordered your free swatches',
                        }),
                    },
                    { status: 403 }
                );
            }
        }

        logger.debug('SwatchOrder: processing selection', {
            basketId,
            selectedCount: requestedIds.length,
        });

        // Current swatch lines = basket product items whose productId is in the swatch set.
        const currentSwatches =
            basket.productItems?.filter((item) => item.productId && swatchIdSet.has(item.productId)) ?? [];

        const currentSwatchIds = new Set(currentSwatches.map((item) => item.productId).filter(Boolean) as string[]);
        const desiredSwatchIds = new Set(requestedIds);

        // Determine what to add and what to remove
        const toAdd = requestedIds.filter((id) => !currentSwatchIds.has(id));
        const toRemove = currentSwatches.filter((item) => item.productId && !desiredSwatchIds.has(item.productId));

        logger.debug('SwatchOrder: reconciliation plan', {
            basketId,
            toAdd: toAdd.length,
            toRemove: toRemove.length,
        });

        // Remove deselected swatches
        for (const item of toRemove) {
            if (item.itemId) {
                await clients.shopperBasketsV2.removeItemFromBasket({
                    params: {
                        path: {
                            basketId,
                            itemId: item.itemId,
                        },
                    },
                });
            }
        }

        // Add newly selected swatches as regular $0 lines (no bonusDiscountLineItemId)
        if (toAdd.length > 0) {
            await clients.shopperBasketsV2.addItemToBasket({
                params: { path: { basketId } },
                body: toAdd.map((productId) => ({
                    productId,
                    quantity: 1,
                })),
            });
        }

        // Return the final basket state
        const { data: finalBasket } = await clients.shopperBasketsV2.getBasket({
            params: { path: { basketId } },
        });

        return finalBasket;
    }
);
