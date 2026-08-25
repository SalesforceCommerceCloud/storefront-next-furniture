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
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';
import type { ShopperExperience } from '@/scapi';
import AboutUs, { type AboutUsPageData } from './_app.about-us';

vi.mock('@/components/link', () => ({
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}));

vi.mock('@/components/contact', () => ({
    default: () => <div data-testid="contact">Contact form</div>,
}));

vi.mock('@/components/region', () => ({
    Region: ({ regionId, page }: { regionId: string; page: ShopperExperience.schemas['Page'] | null }) => {
        const region = page?.regions?.find((item) => item.id === regionId);
        return region?.components?.length ? <div data-testid={`region-${regionId}`} /> : null;
    },
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => {
        const translations: Record<string, string> = {
            'meta.title': 'About Furniture',
            'meta.description': 'Furniture made for everyday living.',
            'breadcrumb.home': 'Home',
            'breadcrumb.aboutUs': 'About Us',
            title: 'About Us',
            'hero.eyebrow': 'Our point of view',
            'hero.title': 'Furniture for the life unfolding around it.',
            'hero.body': 'We create rooms made to be lived in.',
            'hero.imageAlt': 'A warm living room with a neutral sofa.',
            'hero.ctaText': 'Explore the collection',
            'hero.ctaLink': '/category/root',
            'principles.eyebrow': 'Made with intention',
            'principles.title': 'The details make a home feel like yours.',
            'principles.materials.title': 'Materials that invite living',
            'principles.materials.content': 'Texture, tone, and finish bring a room together.',
            'principles.materials.imageAlt': 'Fabric swatches and furniture hardware on wood.',
            'principles.living.title': 'Designed around real routines',
            'principles.living.content': 'Pieces that support slow mornings and full tables.',
            'principles.living.imageAlt': 'A calm bedroom with layered bedding.',
            'closing.eyebrow': 'Make room for living',
            'closing.title': 'Bring the people and rituals you love together.',
            'closing.content': 'Thoughtful furniture gives everyday life a place to happen.',
            'closing.imageAlt': 'A warm dining room set for a meal.',
            'closing.ctaText': 'Shop Now',
            'closing.ctaLink': '/category/root',
        };
        return { t: (key: string) => translations[key] ?? key };
    },
}));

const renderComponent = (page: AboutUsPageData['page'] = null) =>
    render(
        <AboutUs
            loaderData={{
                page,
                pageUrl: 'http://localhost/about-us',
                ogImageUrl: 'http://localhost/images/hero-01.webp',
            }}
        />
    );

describe('Furniture AboutUs', () => {
    test('renders the static Furniture brand story and contact form when slots are empty', () => {
        renderComponent();

        expect(screen.getByRole('heading', { name: 'About Us', level: 1 })).toBeInTheDocument();
        expect(
            screen.getByRole('heading', { name: 'Furniture for the life unfolding around it.', level: 2 })
        ).toBeInTheDocument();
        expect(screen.getByText('Materials that invite living')).toBeInTheDocument();
        expect(screen.getByText('Designed around real routines')).toBeInTheDocument();
        expect(screen.getByTestId('contact')).toBeInTheDocument();
        expect(screen.getByText('Bring the people and rituals you love together.')).toBeInTheDocument();
    });

    test('does not render empty Page Designer slots', () => {
        renderComponent({ id: 'aboutus', typeId: 'aboutus', regions: [], componentData: {} });

        expect(screen.queryByTestId('region-afterIntro')).not.toBeInTheDocument();
        expect(screen.queryByTestId('region-afterPrinciples')).not.toBeInTheDocument();
        expect(screen.queryByTestId('region-afterContact')).not.toBeInTheDocument();
        expect(screen.queryByTestId('region-bottom')).not.toBeInTheDocument();
    });

    test('renders Page Designer content in populated slots without replacing static content', () => {
        renderComponent({
            id: 'aboutus',
            typeId: 'aboutus',
            regions: [{ id: 'afterIntro', components: [{ id: 'component-1', typeId: 'contentCard' }] }],
            componentData: {},
        });

        expect(screen.getByTestId('region-afterIntro')).toBeInTheDocument();
        expect(screen.getByText('Materials that invite living')).toBeInTheDocument();
    });

    test('uses descriptive alternative text for editorial images', () => {
        renderComponent();

        expect(screen.getByAltText('A warm living room with a neutral sofa.')).toBeInTheDocument();
        expect(screen.getByAltText('Fabric swatches and furniture hardware on wood.')).toBeInTheDocument();
        expect(screen.getByAltText('A calm bedroom with layered bedding.')).toBeInTheDocument();
        expect(screen.getByAltText('A warm dining room set for a meal.')).toBeInTheDocument();
    });

    test('links About Us calls to action to the Furniture root category', () => {
        renderComponent();

        expect(screen.getByRole('link', { name: 'Explore the collection' })).toHaveAttribute('href', '/category/root');
        expect(screen.getByRole('link', { name: 'Shop Now' })).toHaveAttribute('href', '/category/root');
    });
});
