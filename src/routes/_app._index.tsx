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
import { Suspense } from 'react';
import { Await, redirect, useAsyncError } from 'react-router';
import type { Route } from './+types/_app._index';
import type { ShopperProducts, ShopperSearch } from '@/scapi';
import { fetchCarouselProducts } from '@/components/product-carousel/loaders';
import { fetchCategories } from '@/lib/api/categories.server';
import { siteContext, resolvePrefix, type SiteContext } from '@salesforce/storefront-next-runtime/site-context';
import { Region } from '@/components/region';
import ContentCard from '@/components/content-card';
import Hero from '@/components/hero';
import PopularCategory from '@/components/home/popular-category';
import { Grid } from '@/components/grid';
import { ProductMerchandisingGrid, ProductMerchandisingGridSkeleton } from '@/components/product-merchandising-grid';
import { Skeleton } from '@/components/ui/skeleton';
import { getConfig } from '@salesforce/storefront-next-runtime/config';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { fetchPageWithComponentData } from '@/lib/page-designer/page-loader.server';
import { getLogger } from '@/lib/logger.server';
import HeroCarousel, { type HeroSlide } from '@/components/hero-carousel';
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { useTranslation } from 'react-i18next';
import type { NormalizedApiError } from '@/lib/api/normalized-api-error';
import { routes, routeHref } from '@/route-paths';

import hero01 from '/images/hero-01.webp';
import hero02 from '/images/hero-02.webp';
import hero03 from '/images/hero-03.webp';
import hero04 from '/images/hero-04.webp';

export { shouldRevalidate } from '@/lib/revalidation/routes/home';

@PageType({
    name: 'Home Page',
    description: 'Furniture landing page with static marketing sections and interspersed Page Designer slots.',
    supportedAspectTypes: [],
})
@RegionDefinition([
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
])
export class HomePageMetadata {}

function ProductsError() {
    const error = useAsyncError() as NormalizedApiError;
    const { t } = useTranslation('home');

    return (
        <div role="alert" className="py-8 text-center text-muted-foreground">
            <p>{t('featuredProducts.loadFailed')}</p>
            {import.meta.env.DEV && (
                <div className="mt-2 text-xs font-mono text-muted-foreground/70">
                    {error.status && <span>{error.status}</span>}
                    {error.message && <p>{error.message}</p>}
                </div>
            )}
        </div>
    );
}

function ShopByRoomMosaic({ categories }: { categories: ShopperProducts.schemas['Category'][] }) {
    const [primary, ...secondary] = categories.slice(0, 5);
    const { t } = useTranslation('home');

    if (!primary) {
        return null;
    }

    return (
        <section className="section-container py-12 md:py-16" data-slot="shop-by-room-grid">
            <div className="mb-6 flex flex-col gap-1 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">{t('shopByRoom.title')}</h2>
                <p className="max-w-md text-sm text-muted-foreground">{t('shopByRoom.subtitle')}</p>
            </div>
            <Grid
                className="grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:min-h-[28rem] md:gap-4 lg:min-h-[32rem]"
                data-slot="shop-by-room-mosaic">
                <PopularCategory
                    category={primary}
                    mediaAspectRatio="fill"
                    className="col-span-2 min-h-[220px] md:row-span-2 md:min-h-0 md:h-full"
                    aria-label={t('shopByRoom.exploreRoom', { room: primary.name })}
                />
                {secondary.map((category) => (
                    <PopularCategory
                        key={category.id}
                        category={category}
                        mediaAspectRatio="fill"
                        className="aspect-[4/3] md:aspect-auto md:h-full"
                        aria-label={t('shopByRoom.exploreRoom', { room: category.name })}
                    />
                ))}
            </Grid>
        </section>
    );
}

function ShopByRoomMosaicSkeleton() {
    return (
        <section aria-busy="true" className="section-container py-12 md:py-16" data-slot="shop-by-room-grid-skeleton">
            <div className="mb-6 space-y-2 sm:mb-8">
                <Skeleton className="h-9 w-56 md:h-10" />
                <Skeleton className="h-5 w-full max-w-md" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:grid-rows-2 md:min-h-[28rem] md:gap-4 lg:min-h-[32rem]">
                <Skeleton className="col-span-2 min-h-[220px] md:row-span-2 md:min-h-0" />
                {Array.from({ length: 4 }, (_, index) => (
                    <Skeleton key={index} className="aspect-[4/3] md:aspect-auto md:h-full" />
                ))}
            </div>
        </section>
    );
}

export type HomePageData = {
    page: ReturnType<typeof fetchPageWithComponentData>;
    products: Promise<ShopperSearch.schemas['ProductSearchResult']>;
    categories: Promise<ShopperProducts.schemas['Category'][]>;
    rootCategoryId: string;
    pageUrl: string;
    ogImageUrl: string;
};

export function loader(args: Route.LoaderArgs): HomePageData {
    const logger = getLogger(args.context);
    logger.debug('FurnitureHomePage: loader starting');

    const config = getConfig(args.context);
    const requestUrl = new URL(args.request.url);

    if (requestUrl.pathname === '/' && config.url?.prefix && config.url.prefix !== '/') {
        const siteRef = config.siteAliasMap?.[config.defaultSiteId] ?? config.defaultSiteId;
        const defaultSite = config.commerce.sites.find((site) => site.id === config.defaultSiteId);
        const defaultLocale = defaultSite?.defaultLocale ?? config.i18n.fallbackLng;
        const localeRef = config.localeAliasMap?.[defaultLocale] ?? defaultLocale;
        const prefixedPath = resolvePrefix({
            prefix: config.url.prefix,
            params: { siteId: siteRef, localeId: localeRef },
        });
        throw redirect(`${prefixedPath}/`);
    }

    const currency = (args.context.get(siteContext) as SiteContext).currency;
    const rootCategoryId = config.pages.navigation.rootCategoryId;

    return {
        page: fetchPageWithComponentData(args, { pageId: 'homepage' }),
        // The grid renders a bounded assortment from this stable category search promise.
        products: fetchCarouselProducts(args.context, {
            categoryId: rootCategoryId,
            limit: config.pages.home.featuredProductsCount,
            currency: currency ?? undefined,
        }),
        categories: fetchCategories(args.context, rootCategoryId, 1),
        rootCategoryId,
        pageUrl: buildCanonicalUrl(requestUrl.origin, requestUrl.pathname, requestUrl.search),
        ogImageUrl: new URL(hero01, requestUrl.origin).href,
    };
}

export default function HomePage({ loaderData }: { loaderData: HomePageData }) {
    const { t } = useTranslation('home');
    const rootCategoryUrl = routeHref(routes.category, { categoryId: loaderData.rootCategoryId });

    const heroSlides: HeroSlide[] = [
        {
            id: 'living-room',
            title: t('hero.slide1.title'),
            subtitle: t('hero.slide1.subtitle'),
            imageUrl: hero01,
            imageAlt: t('hero.slide1.imageAlt'),
            ctaText: t('hero.slide1.ctaText'),
            ctaAriaLabel: t('hero.slide1.ctaAriaLabel'),
            ctaLink: rootCategoryUrl,
            overlayPosition: 'Middle Left',
            overlayAlignment: 'left',
        },
        {
            id: 'dining',
            title: t('hero.slide2.title'),
            subtitle: t('hero.slide2.subtitle'),
            imageUrl: hero02,
            imageAlt: t('hero.slide2.imageAlt'),
            ctaText: t('hero.slide2.ctaText'),
            ctaAriaLabel: t('hero.slide2.ctaAriaLabel'),
            ctaLink: rootCategoryUrl,
            overlayPosition: 'Middle Left',
            overlayAlignment: 'left',
        },
        {
            id: 'bedroom',
            title: t('hero.slide3.title'),
            subtitle: t('hero.slide3.subtitle'),
            imageUrl: hero03,
            imageAlt: t('hero.slide3.imageAlt'),
            ctaText: t('hero.slide3.ctaText'),
            ctaAriaLabel: t('hero.slide3.ctaAriaLabel'),
            ctaLink: rootCategoryUrl,
            overlayPosition: 'Middle Left',
            overlayAlignment: 'left',
        },
        {
            id: 'home-office',
            title: t('hero.slide4.title'),
            subtitle: t('hero.slide4.subtitle'),
            imageUrl: hero04,
            imageAlt: t('hero.slide4.imageAlt'),
            ctaText: t('hero.slide4.ctaText'),
            ctaAriaLabel: t('hero.slide4.ctaAriaLabel'),
            ctaLink: rootCategoryUrl,
            overlayPosition: 'Middle Left',
            overlayAlignment: 'left',
        },
    ];

    return (
        <div className="pb-16 -mt-8" data-slot="furniture-home">
            <h1 className="sr-only">{t('meta.title')}</h1>
            <SeoMeta
                rawTitle
                title={t('meta.title')}
                description={t('meta.description')}
                openGraph={{ type: 'website', url: loaderData.pageUrl, image: loaderData.ogImageUrl }}
            />

            <Region page={loaderData.page} regionId="headerbanner" />

            <HeroCarousel
                slides={heroSlides}
                autoPlay={true}
                autoPlayInterval={7000}
                showNavigation={true}
                showDots={true}
            />

            <Region page={loaderData.page} regionId="afterHero" />

            <Suspense fallback={<ShopByRoomMosaicSkeleton />}>
                <Await resolve={loaderData.categories} errorElement={null}>
                    {(categories) => <ShopByRoomMosaic categories={categories} />}
                </Await>
            </Suspense>

            <Region page={loaderData.page} regionId="afterRoomDiscovery" />

            <div className="section-container py-8 md:py-12" data-slot="furniture-bedroom-banner">
                <div className="overflow-hidden rounded-ui">
                    <Hero
                        title={t('midBanner.title')}
                        subtitle={t('midBanner.subtitle')}
                        imageUrl={{ url: hero03 }}
                        imageAlt={t('midBanner.imageAlt')}
                        ctaText={t('midBanner.ctaText')}
                        ctaAriaLabel={t('midBanner.ctaAriaLabel')}
                        ctaLink={rootCategoryUrl}
                        overlay="Dark"
                        overlayPosition="Middle Left"
                        overlayAlignment="left"
                        height="md"
                        priority="auto"
                        loading="lazy"
                        headingLevel={2}
                    />
                </div>
            </div>

            <Region page={loaderData.page} regionId="afterBedroomBanner" />

            <Suspense
                fallback={
                    <ProductMerchandisingGridSkeleton
                        columns={3}
                        rows={2}
                        title={t('featuredProducts.title')}
                        shopAllText={t('featuredProducts.shopAll')}
                        shopAllUrl={rootCategoryUrl}
                    />
                }>
                <Await resolve={loaderData.products} errorElement={<ProductsError />}>
                    {(products) => (
                        <ProductMerchandisingGrid
                            products={products.hits ?? []}
                            columns={3}
                            rows={2}
                            title={t('featuredProducts.title')}
                            shopAllText={t('featuredProducts.shopAll')}
                            shopAllUrl={rootCategoryUrl}
                        />
                    )}
                </Await>
            </Suspense>

            <Region page={loaderData.page} regionId="main" />

            <div className="pt-4 md:pt-8" data-section="furniture-home-editorial">
                <div className="section-container">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                        <ContentCard
                            title={t('editorial.madeToOrder.title')}
                            description={t('editorial.madeToOrder.description')}
                            imageUrl={hero02}
                            imageAlt={t('editorial.madeToOrder.imageAlt')}
                            buttonText={t('editorial.madeToOrder.ctaText')}
                            buttonAriaLabel={t('editorial.madeToOrder.ctaAriaLabel')}
                            buttonLink={rootCategoryUrl}
                            showBackground={false}
                            showBorder={false}
                            loading="lazy"
                        />
                        <ContentCard
                            title={t('editorial.swatches.title')}
                            description={t('editorial.swatches.description')}
                            imageUrl={hero04}
                            imageAlt={t('editorial.swatches.imageAlt')}
                            buttonText={t('editorial.swatches.ctaText')}
                            buttonAriaLabel={t('editorial.swatches.ctaAriaLabel')}
                            buttonLink={rootCategoryUrl}
                            showBackground={false}
                            showBorder={false}
                            loading="lazy"
                        />
                    </div>
                </div>
                <div className="mt-16 px-4" data-slot="furniture-home-brand">
                    <ContentCard
                        className="w-full"
                        title={t('editorial.brand.title')}
                        description={t('editorial.brand.description')}
                        cardFooterClassName="min-h-36 items-center text-center md:min-h-40"
                        cardDescriptionClassName="mx-auto max-w-4xl items-center text-center [&_h3]:font-serif [&_h3]:text-4xl [&_h3]:font-semibold [&_h3]:tracking-tight"
                    />
                </div>
            </div>

            <Region page={loaderData.page} regionId="bottom" />
        </div>
    );
}
