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

/**
 * Furniture per-page UI overrides:
 * - Renders the `fabric` variation axis as a grouped/tabbed swatch selector
 *   (`product.groupedSwatchAxes`). Furniture ships fabric display-values as
 *   "Label, Family" (e.g. "Navy, Velvet"), so the PDP shows a family filter row
 *   ["All", Linen, Velvet, Leather, Performance] above image-tile swatches that
 *   display the short label (the part before the first comma).
 * - Renders the `size` and `legStyle` axes as larger "option cards"
 *   (`product.imageCardAxes`): a 4:3 image thumb stacked above the option name +
 *   price hint, all inside one bordered, padded card — visually distinct from the
 *   small fabric swatches.
 * - Wraps each swatch section in a collapsible (`product.collapsibleSwatchSections`):
 *   the collapsed summary shows the selected value's thumbnail + attribute label +
 *   selected value name, and the section collapses after a value is selected.
 *
 * "Your Configuration" and "Available services" are NOT config-gated: they're rendered by
 * the furniture PDP route + ProductView overlays — the summary shows once a full variant is
 * resolved; services resolve from the catalog via the product's `c_addonServiceProductIds`
 * attribute. The furniture route overlay also adds the PDP recommendation rails.
 *
 * Every other flag matches the canonical baseline, so cart, category, and the
 * rest of the product page behave exactly like the default (mirrored verbatim
 * below).
 */
interface UIConfig {
    pages: {
        cart: {
            showRecommendations: boolean;
            showLineItemVariantAttributes: boolean;
            showLineItemListPrice: boolean;
            showLineItemPromoBadge: boolean;
            showLineItemBonusBadge: boolean;
        };
        category: {
            showCategoryLabel: boolean;
            pagination: {
                mode: 'load-more' | 'traditional';
                batchSize: number;
                mobileBatchSize: number;
                maxProducts: number;
            };
            /** Opt-in: keep the `cgid` refinement in the sidebar as a single-select radio group. @default undefined */
            sidebarCategoryRefinement?: {
                enabled: boolean;
            };
            /** When true, product tiles link to the master product PDP instead of the represented variant. @default false */
            tileLinksToMasterProduct?: boolean;
        };
        product: {
            showRatingAverage: boolean;
            /** Variation-attribute ids rendered as a grouped/tabbed swatch selector. @default undefined */
            groupedSwatchAxes?: string[];
            /** Variation-attribute ids whose image swatches render as larger option cards. @default undefined */
            imageCardAxes?: string[];
            /** When true, wrap each PDP swatch section in a collapsible with a selected-value summary. @default false */
            collapsibleSwatchSections?: boolean;
            /** PDP product-image gallery layout: 'stacked' (hero + thumbnails) or 'mosaic'. @default 'stacked' */
            galleryLayout?: 'stacked' | 'mosaic';
        };
    };
}

export const uiConfig: UIConfig = {
    pages: {
        cart: {
            showRecommendations: true,
            showLineItemVariantAttributes: true,
            showLineItemListPrice: true,
            showLineItemPromoBadge: true,
            showLineItemBonusBadge: true,
        },
        category: {
            showCategoryLabel: false,
            pagination: {
                mode: 'load-more',
                batchSize: 24,
                mobileBatchSize: 12,
                maxProducts: 200,
            },
            // Furniture tiles link to the master PDP so the shopper configures size/fabric/leg from
            // scratch (paired with the PDP "Choose Options" flow), rather than deep-linking to the
            // search API's represented variant. Every other vertical leaves this off.
            tileLinksToMasterProduct: true,
        },
        product: {
            showRatingAverage: false,
            groupedSwatchAxes: ['fabric'],
            imageCardAxes: ['size', 'legStyle'],
            collapsibleSwatchSections: true,
            galleryLayout: 'mosaic',
        },
    },
};
