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
import type { TFunction } from 'i18next';
import type { Route } from './+types/_app.about-us';
import { Link } from '@/components/link';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Contact from '@/components/contact';
import { Region } from '@/components/region';
import { SeoMeta } from '@/components/seo-meta';
import { Typography } from '@/components/typography';
import { PageType } from '@/lib/decorators/page-type';
import { RegionDefinition } from '@/lib/decorators/region-definition';
import { getLogger } from '@/lib/logger.server';
import { fetchPageWithComponentData, type PageWithComponentData } from '@/lib/page-designer/page-loader.server';
import { buildCanonicalUrl } from '@/utils/canonical-url';
import { useTranslation } from 'react-i18next';
import heroLivingRoom from '/images/hero-01.webp';
import materialsImage from '/images/hero-02.webp';
import bedroomImage from '/images/hero-03.webp';
import diningImage from '/images/hero-04.webp';

@PageType({
    name: 'About Us Page',
    description: 'Furniture brand story with static editorial content and Page Designer slots.',
    supportedAspectTypes: [],
})
@RegionDefinition([
    {
        id: 'afterIntro',
        name: 'After Intro Slot',
        description: 'Optional content between the brand introduction and the design principles.',
        maxComponents: 10,
    },
    {
        id: 'afterPrinciples',
        name: 'After Principles Slot',
        description: 'Optional content between the design principles and contact section.',
        maxComponents: 10,
    },
    {
        id: 'afterContact',
        name: 'After Contact Slot',
        description: 'Optional content between the contact section and closing invitation.',
        maxComponents: 10,
    },
    {
        id: 'bottom',
        name: 'Bottom Slot',
        description: 'Optional content below the closing invitation.',
        maxComponents: 10,
    },
])
export class AboutUsPageMetadata {}

export type AboutUsPageData = {
    page: PageWithComponentData | null;
    pageUrl: string;
    ogImageUrl: string;
};

export async function loader(args: Route.LoaderArgs): Promise<AboutUsPageData> {
    const logger = getLogger(args.context);
    logger.debug('FurnitureAboutUs: loader starting');

    const requestUrl = new URL(args.request.url);
    return {
        page: await fetchPageWithComponentData(args, { pageId: 'aboutus' }),
        pageUrl: buildCanonicalUrl(requestUrl.origin, requestUrl.pathname, requestUrl.search),
        ogImageUrl: new URL(heroLivingRoom, requestUrl.origin).href,
    };
}

function EditorialImage({ src, alt }: { src: string; alt: string }) {
    return <img className="h-full w-full object-cover" src={src} alt={alt} loading="lazy" />;
}

function BrandIntroduction({ t }: { t: TFunction<'furnitureAboutUs'> }) {
    return (
        <section
            className="grid overflow-hidden rounded-ui bg-secondary md:grid-cols-2"
            aria-labelledby="about-introduction-heading">
            <div className="min-h-72 md:min-h-[34rem]">
                <EditorialImage src={heroLivingRoom} alt={t('hero.imageAlt')} />
            </div>
            <div className="flex flex-col justify-center gap-6 p-8 md:p-12 lg:p-16">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {t('hero.eyebrow')}
                </span>
                <Typography as="h2" variant="h2" id="about-introduction-heading" className="text-3xl md:text-5xl">
                    {t('hero.title')}
                </Typography>
                <p className="max-w-xl whitespace-pre-line text-base leading-relaxed text-muted-foreground md:text-lg">
                    {t('hero.body')}
                </p>
                <Button asChild className="w-fit">
                    <Link to={t('hero.ctaLink')}>{t('hero.ctaText')}</Link>
                </Button>
            </div>
        </section>
    );
}

function Principles({ t }: { t: TFunction<'furnitureAboutUs'> }) {
    const principles = [
        {
            id: 'materials',
            image: materialsImage,
            imageAlt: t('principles.materials.imageAlt'),
            title: t('principles.materials.title'),
            content: t('principles.materials.content'),
        },
        {
            id: 'living',
            image: bedroomImage,
            imageAlt: t('principles.living.imageAlt'),
            title: t('principles.living.title'),
            content: t('principles.living.content'),
        },
    ];

    return (
        <section className="flex flex-col gap-8" aria-labelledby="principles-heading">
            <div className="max-w-2xl">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {t('principles.eyebrow')}
                </span>
                <Typography as="h2" variant="h2" id="principles-heading" className="mt-3 text-3xl md:text-4xl">
                    {t('principles.title')}
                </Typography>
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {principles.map(({ id, image, imageAlt, title, content }) => (
                    <article key={id} className="overflow-hidden rounded-ui bg-card shadow-ui">
                        <div className="aspect-[4/3]">
                            <EditorialImage src={image} alt={imageAlt} />
                        </div>
                        <div className="flex flex-col gap-3 p-6 md:p-8">
                            <Typography as="h3" variant="h3" className="text-2xl">
                                {title}
                            </Typography>
                            <p className="text-base leading-relaxed text-muted-foreground">{content}</p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

function ClosingInvitation({ t }: { t: TFunction<'furnitureAboutUs'> }) {
    return (
        <section
            className="grid overflow-hidden rounded-ui bg-foreground text-background md:grid-cols-2"
            aria-labelledby="closing-heading">
            <div className="min-h-72 md:order-2 md:min-h-[30rem]">
                <EditorialImage src={diningImage} alt={t('closing.imageAlt')} />
            </div>
            <div className="flex flex-col justify-center gap-6 p-8 md:order-1 md:p-12 lg:p-16">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-background/70">
                    {t('closing.eyebrow')}
                </span>
                <Typography as="h2" variant="h2" id="closing-heading" className="text-3xl text-background md:text-5xl">
                    {t('closing.title')}
                </Typography>
                <p className="max-w-xl text-base leading-relaxed text-background/80 md:text-lg">
                    {t('closing.content')}
                </p>
                <Button asChild variant="secondary" className="w-fit">
                    <Link to={t('closing.ctaLink')}>{t('closing.ctaText')}</Link>
                </Button>
            </div>
        </section>
    );
}

/**
 * Furniture About Us uses static brand sections interspersed with independent
 * Page Designer slots. Empty slots deliberately render no storefront content.
 */
export default function AboutUs({ loaderData }: { loaderData: AboutUsPageData }): ReactElement {
    const { t } = useTranslation('furnitureAboutUs');

    return (
        <div className="pb-16">
            <SeoMeta
                title={t('meta.title')}
                description={t('meta.description')}
                openGraph={{ type: 'article', url: loaderData.pageUrl, image: loaderData.ogImageUrl }}
            />

            <div className="section-container py-8 md:py-12">
                <Breadcrumb className="mb-5">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild>
                                <Link to="/">{t('breadcrumb.home')}</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                            <BreadcrumbPage>{t('breadcrumb.aboutUs')}</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>
                <Typography as="h1" variant="h1" className="text-4xl md:text-6xl">
                    {t('title')}
                </Typography>
            </div>

            <div className="section-container flex flex-col gap-16">
                <BrandIntroduction t={t} />
                <Region page={loaderData.page} regionId="afterIntro" />
                <Principles t={t} />
                <Region page={loaderData.page} regionId="afterPrinciples" />
            </div>

            <div className="mt-16 bg-secondary px-4 py-12 md:px-8">
                <div className="section-container">
                    <Card className="[--ui-border-width:0px] bg-background">
                        <CardContent className="p-0">
                            <Contact />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className="section-container mt-16 flex flex-col gap-16">
                <Region page={loaderData.page} regionId="afterContact" />
                <ClosingInvitation t={t} />
                <Region page={loaderData.page} regionId="bottom" />
            </div>
        </div>
    );
}
