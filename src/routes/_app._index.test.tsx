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
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import type { ShopperProducts, ShopperSearch } from '@/scapi';
import { getRegionDefinitions } from '@/lib/decorators/region-definition';
import HomePage, { HomePageMetadata, type HomePageData } from './_app._index';

vi.mock('@/components/region', () => ({
    Region: ({
        regionId,
        errorElement,
        fallbackElement,
    }: {
        regionId: string;
        errorElement?: ReactNode;
        fallbackElement?: ReactNode;
    }) => (
        <div
            data-has-error-element={Boolean(errorElement)}
            data-has-fallback-element={Boolean(fallbackElement)}
            data-region-id={regionId}
            data-slot="page-designer-region"
        />
    ),
}));
vi.mock('@/components/ui/skeleton', () => ({ Skeleton: () => <div data-testid="skeleton" /> }));
vi.mock('@/components/hero-carousel', () => ({
    default: () => <div data-testid="hero-carousel" />,
    HeroCarouselSkeleton: () => <div data-testid="hero-carousel-skeleton" />,
}));
vi.mock('@/components/hero', () => ({ default: () => <div data-testid="editorial-hero" /> }));
vi.mock('@/components/home/popular-category', () => ({
    default: ({ category }: { category: ShopperProducts.schemas['Category'] }) => <div>{category.name}</div>,
}));
vi.mock('@/components/grid', () => ({ Grid: ({ children }: { children: ReactNode }) => <div>{children}</div> }));
vi.mock('@/components/product-merchandising-grid', () => ({
    ProductMerchandisingGrid: ({ title, shopAllUrl }: { title?: string; shopAllUrl?: string }) => (
        <div data-testid="product-merchandising-grid">
            <span>{title}</span>
            <a href={shopAllUrl}>Shop all</a>
        </div>
    ),
    ProductMerchandisingGridSkeleton: ({
        title,
        shopAllText,
        shopAllUrl,
    }: {
        title?: string;
        shopAllText?: string;
        shopAllUrl?: string;
    }) => (
        <div
            data-testid="product-merchandising-grid-skeleton"
            data-shop-all-text={shopAllText}
            data-shop-all-url={shopAllUrl}
            data-title={title}
        />
    ),
}));
vi.mock('@/components/content-card', () => ({
    default: ({
        title,
        className,
        cardFooterClassName,
        cardDescriptionClassName,
    }: {
        title: string;
        className?: string;
        cardFooterClassName?: string;
        cardDescriptionClassName?: string;
    }) => (
        <div
            data-card-description-class-name={cardDescriptionClassName}
            data-card-footer-class-name={cardFooterClassName}
            data-class-name={className}
            data-content-card-title={title}
            data-testid="content-card">
            {title}
        </div>
    ),
}));
vi.mock('@/components/seo-meta', () => ({ SeoMeta: () => null }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) =>
            ({
                'meta.title': 'Furniture Next',
                'meta.description': 'Furniture for every room.',
                'hero.slide1.title': 'Make room for living',
                'hero.slide1.subtitle': 'Thoughtful furniture for everyday life.',
                'hero.slide1.imageAlt': 'A calm living room.',
                'hero.slide1.ctaText': 'Shop living room',
                'shopByRoom.title': 'Shop by room',
                'shopByRoom.subtitle': 'Find pieces that make every room feel considered.',
                'shopByRoom.exploreRoom': 'Explore {{room}}',
                'midBanner.title': 'The bedroom edit',
                'midBanner.subtitle': 'Restful layers, designed around you.',
                'midBanner.imageAlt': 'A warmly styled bedroom.',
                'midBanner.ctaText': 'Explore bedroom',
                'featuredProducts.title': 'Curated for your space',
                'featuredProducts.shopAll': 'Shop all',
                'editorial.madeToOrder.title': 'Made to order',
                'editorial.swatches.title': 'Free swatches',
                'editorial.brand.title': 'Furniture Next',
            })[key] ?? key,
    }),
}));

const categories = Array.from({ length: 5 }, (_, index) => ({
    id: `category-${index + 1}`,
    name: `Category ${index + 1}`,
})) as ShopperProducts.schemas['Category'][];

const searchResult = { hits: [] } as unknown as ShopperSearch.schemas['ProductSearchResult'];

const loaderData: HomePageData = {
    page: Promise.resolve({ id: 'homepage', regions: [], componentData: {} } as never),
    products: Promise.resolve(searchResult),
    categories: Promise.resolve(categories),
    rootCategoryId: 'root',
    pageUrl: 'https://example.com/global/en-GB/',
    ogImageUrl: 'https://example.com/images/hero-01.webp',
};

describe('Furniture home page', () => {
    test('intersperses empty Page Designer slots between static home content', async () => {
        const { container } = render(<HomePage loaderData={loaderData} />);

        expect(screen.getByRole('heading', { name: 'Furniture Next', level: 1 })).toBeInTheDocument();
        expect(screen.getByTestId('hero-carousel')).toBeInTheDocument();
        expect(screen.getByTestId('editorial-hero')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByTestId('product-merchandising-grid')).toBeInTheDocument();
        });

        await waitFor(() => {
            expect(screen.getByText('Category 1')).toBeInTheDocument();
            expect(screen.getByText('Category 5')).toBeInTheDocument();
        });

        expect(screen.getAllByTestId('content-card')).toHaveLength(3);
        expect(screen.getByText('Curated for your space')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Shop all' })).toHaveAttribute('href', '/category/root');
        expect(Array.from(container.querySelectorAll('[data-slot="page-designer-region"]'))).toHaveLength(6);
        expect(
            Array.from(container.querySelectorAll('[data-slot="page-designer-region"]')).map((region) =>
                region.getAttribute('data-region-id')
            )
        ).toEqual(['headerbanner', 'afterHero', 'afterRoomDiscovery', 'afterBedroomBanner', 'main', 'bottom']);
        for (const region of container.querySelectorAll('[data-slot="page-designer-region"]')) {
            expect(region).toHaveAttribute('data-has-error-element', 'false');
            expect(region).toHaveAttribute('data-has-fallback-element', 'false');
        }
    });

    test('renders the Furniture Next brand card at the full page width', () => {
        render(<HomePage loaderData={loaderData} />);

        const brandSection = document.querySelector('[data-slot="furniture-home-brand"]');
        expect(brandSection).toHaveClass('mt-16', 'px-4');

        const brandCard = document.querySelector('[data-content-card-title="Furniture Next"]');
        expect(brandCard).toHaveAttribute('data-class-name', expect.stringContaining('w-full'));
        expect(brandCard).toHaveAttribute('data-card-footer-class-name', expect.stringContaining('items-center'));
        expect(brandCard).toHaveAttribute('data-card-description-class-name', expect.stringContaining('max-w-4xl'));
    });

    test('retains existing Page Designer regions while adding interstitial slots', () => {
        expect(getRegionDefinitions(HomePageMetadata)).toEqual([
            {
                id: 'headerbanner',
                name: 'Header Banner Region',
                description: 'Content displayed before the Furniture home hero.',
                maxComponents: 3,
            },
            {
                id: 'afterHero',
                name: 'After Hero Slot',
                description: 'Empty slot between the hero carousel and room discovery.',
                maxComponents: 3,
            },
            {
                id: 'afterRoomDiscovery',
                name: 'After Room Discovery Slot',
                description: 'Empty slot between room discovery and the bedroom banner.',
                maxComponents: 3,
            },
            {
                id: 'afterBedroomBanner',
                name: 'After Bedroom Banner Slot',
                description: 'Empty slot between the bedroom banner and featured products.',
                maxComponents: 3,
            },
            {
                id: 'main',
                name: 'Main Content Region',
                description: 'Content displayed after the Furniture home product sections.',
                maxComponents: 10,
            },
            {
                id: 'bottom',
                name: 'Bottom Slot',
                description: 'Empty slot below the Furniture home editorial content.',
                maxComponents: 10,
            },
        ]);
    });

    test('keeps the home available when room categories fail to load', async () => {
        const rejectedCategories = Promise.reject(new Error('Category API failed'));
        rejectedCategories.catch(() => undefined);

        render(<HomePage loaderData={{ ...loaderData, categories: rejectedCategories }} />);

        await waitFor(() => {
            expect(screen.getByTestId('product-merchandising-grid')).toBeInTheDocument();
        });

        expect(screen.getByTestId('hero-carousel')).toBeInTheDocument();
        expect(screen.getByTestId('editorial-hero')).toBeInTheDocument();
        expect(screen.getAllByTestId('content-card')).toHaveLength(3);
        expect(document.querySelector('[data-slot="shop-by-room-grid"]')).not.toBeInTheDocument();
    });

    test('reserves the featured-products heading while its category search resolves', () => {
        const pendingProducts = new Promise<ShopperSearch.schemas['ProductSearchResult']>(() => undefined);

        render(<HomePage loaderData={{ ...loaderData, products: pendingProducts }} />);

        expect(screen.getByTestId('product-merchandising-grid-skeleton')).toHaveAttribute(
            'data-title',
            'Curated for your space'
        );
        expect(screen.getByTestId('product-merchandising-grid-skeleton')).toHaveAttribute(
            'data-shop-all-text',
            'Shop all'
        );
        expect(screen.getByTestId('product-merchandising-grid-skeleton')).toHaveAttribute(
            'data-shop-all-url',
            '/category/root'
        );
    });

    test('reserves the room-mosaic layout while categories load', () => {
        const pendingCategories = new Promise<ShopperProducts.schemas['Category'][]>(() => undefined);

        render(<HomePage loaderData={{ ...loaderData, categories: pendingCategories }} />);

        expect(document.querySelector('[data-slot="shop-by-room-grid-skeleton"]')).toBeInTheDocument();
    });
});
