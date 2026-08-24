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
import type { Route } from './+types/_app.showrooms';
import { useTranslation } from 'react-i18next';
import { getGcpApiKeyLazy } from '@salesforce/storefront-next-runtime/data-store';
import ShowroomLocator from '@/components/showroom-locator';
import { SeoMeta } from '@/components/seo-meta';
import { buildCanonicalUrl } from '@/utils/canonical-url';

export async function loader({ context, request }: Route.LoaderArgs) {
    const url = new URL(request.url);
    const gcpApiKey = await getGcpApiKeyLazy(context).catch(() => '');
    return { gcpApiKey, pageUrl: buildCanonicalUrl(url.origin, url.pathname, url.search) };
}

export default function ShowroomsPage({ loaderData }: Route.ComponentProps) {
    const { t } = useTranslation('showrooms');
    return (
        <main className="bg-background">
            <SeoMeta
                title={t('meta.title')}
                description={t('meta.description')}
                openGraph={{ url: loaderData.pageUrl }}
            />
            <header className="border-b border-border bg-muted/40">
                <div className="mx-auto max-w-screen-2xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">{t('eyebrow')}</p>
                    <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                        {t('title')}
                    </h1>
                    <p className="mt-5 max-w-2xl text-lg text-muted-foreground">{t('description')}</p>
                </div>
            </header>
            <section
                aria-labelledby="showroom-search-heading"
                className="mx-auto max-w-screen-2xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <ShowroomLocator gcpApiKey={loaderData.gcpApiKey} />
            </section>
        </main>
    );
}
