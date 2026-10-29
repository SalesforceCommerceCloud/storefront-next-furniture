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
import { beforeEach, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { StrictMode, type PropsWithChildren } from 'react';
import ProductPage, { type ProductPageData } from './_app.p.$';

const tracking = vi.hoisted(() => ({ consentKey: 'accepted', trackViewProduct: vi.fn().mockResolvedValue(true) }));
vi.mock('@/hooks/use-analytics', () => ({
    useAnalytics: () => ({ consentKey: tracking.consentKey, trackViewProduct: tracking.trackViewProduct }),
}));
vi.mock('react-router', async (importOriginal) => ({
    ...(await importOriginal<typeof import('react-router')>()),
    useRouteLoaderData: () => ({ nonce: undefined }),
    useLocation: () => ({ pathname: '/p/test-product-123', search: '', hash: '', key: 'default' }),
    useNavigation: () => ({ state: 'idle' }),
}));
vi.mock('@salesforce/storefront-next-runtime/site-context', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@salesforce/storefront-next-runtime/site-context')>()),
    useSite: () => ({ site: { id: 'test-site' }, locale: { id: 'en-US' } }),
}));
vi.mock('@/components/product-view/product-view', () => ({ default: () => <div data-testid="product-view" /> }));
vi.mock('@/components/product-view/child-products', () => ({ default: () => null }));
vi.mock('@/components/product-recommendations', () => ({ default: () => null }));
vi.mock('@/components/category-breadcrumbs', () => ({ default: () => null }));
vi.mock('@/components/region', () => ({ Region: () => null }));
vi.mock('@/components/json-ld', () => ({ JsonLd: () => null }));
vi.mock('@/components/seo-meta', () => ({ SeoMeta: () => null }));
vi.mock('@/providers/product-context', () => ({ ProductProvider: ({ children }: PropsWithChildren) => children }));
vi.mock('@/providers/product-view', () => ({ default: ({ children }: PropsWithChildren) => children }));
vi.mock('../context/service-addons-context', () => ({ default: ({ children }: PropsWithChildren) => children }));
vi.mock('@/hooks/use-deferred-render', () => ({ useDeferredRender: () => false }));
vi.mock('@/targets/ui-target', () => ({ UITarget: () => null }));
vi.mock('@/extensions/ratings-reviews/providers/product-reviews-context', () => ({
    ProductReviewsProvider: ({ children }: PropsWithChildren) => children,
}));
vi.mock('@/extensions/ratings-reviews/context/write-review-form-context', () => ({
    WriteReviewFormProvider: ({ children }: PropsWithChildren) => children,
    useWriteReviewForm: () => null,
}));
vi.mock('@/extensions/product-content/context/product-content-data-context', () => ({
    ProductContentDataProvider: ({ children }: PropsWithChildren) => children,
}));
vi.mock('@/extensions/bnpl/context/bnpl-context', () => ({
    BnplProvider: ({ children }: PropsWithChildren) => children,
}));
vi.mock('@/extensions/bopis/context/pickup-context', () => ({
    default: ({ children }: PropsWithChildren) => children,
}));
vi.mock('@/extensions/shipping-delivery/context/shipping-delivery-context', () => ({
    ShippingDeliveryProvider: ({ children }: PropsWithChildren) => children,
}));

beforeEach(() => {
    tracking.consentKey = 'accepted';
    tracking.trackViewProduct.mockReset().mockResolvedValue(true);
});

test('recovers the current product after consent, deduplicates Strict Mode, and aborts on unmount', async () => {
    const data: ProductPageData = {
        product: { id: 'test-product-123', name: 'Test Product' },
        page: Promise.resolve({ id: 'pdp', typeId: 'page', regions: [] }),
        pageKey: 'test-product-123',
        pageUrl: '/p/test-product-123',
        productSchema: Promise.resolve(null),
        youMightAlsoLikeRecommendations: Promise.resolve({}),
        completeTheRoomRecommendations: Promise.resolve({}),
        bnplMessage: Promise.resolve({ paymentCount: 4, amountPerPayment: 0 }),
        bnplLearnMore: Promise.resolve({
            paymentSchedule: { amountPerPayment: 0, totalAmount: 0, schedule: [] },
            howItWorks: [],
            disclosures: '',
        }),
        reviewsSummary: {
            totalCount: 0,
            averageRating: 0,
            distribution: { oneStar: 0, twoStars: 0, threeStars: 0, fourStars: 0, fiveStars: 0 },
            basedOnLabel: '',
        },
        reviewsList: new Promise(() => {}),
        writeReviewForm: new Promise(() => {}),
        returnsWarranty: new Promise(() => {}),
        pdpCollapsibles: Promise.resolve([]),
    };
    tracking.consentKey = 'unknown';
    tracking.trackViewProduct.mockResolvedValueOnce(false);
    const view = render(
        <StrictMode>
            <ProductPage loaderData={data} />
        </StrictMode>
    );
    expect(screen.getByTestId('product-view')).toBeInTheDocument();
    await act(async () => {});
    expect(tracking.trackViewProduct).toHaveBeenCalledTimes(1);
    tracking.consentKey = 'accepted';
    view.rerender(
        <StrictMode>
            <ProductPage loaderData={data} />
        </StrictMode>
    );
    await act(async () => {});
    expect(tracking.trackViewProduct).toHaveBeenCalledTimes(2);
    view.rerender(
        <StrictMode>
            <ProductPage loaderData={{ ...data, product: { ...data.product } }} />
        </StrictMode>
    );
    await act(async () => {});
    expect(tracking.trackViewProduct).toHaveBeenCalledTimes(2);
    tracking.trackViewProduct.mockImplementationOnce(() => new Promise<boolean>(() => {}));
    view.rerender(
        <StrictMode>
            <ProductPage loaderData={{ ...data, product: { ...data.product, id: 'variant' } }} />
        </StrictMode>
    );
    await act(async () => {});
    const signal = tracking.trackViewProduct.mock.calls[2][1] as AbortSignal;
    expect(signal.aborted).toBe(false);
    view.unmount();
    expect(signal.aborted).toBe(true);
});
