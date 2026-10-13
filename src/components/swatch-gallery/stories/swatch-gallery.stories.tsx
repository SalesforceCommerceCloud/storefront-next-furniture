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
import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { ShopperProducts } from '@/scapi';
import SwatchGallery from '../index';
// Fabric-swatch imagery lives in the dataset repo (served via SCAPI/DIS at runtime), not the
// template's public/ dir, so this Storybook mock uses a placeholder URL rather than importing a
// public asset. This matches the placehold.co convention other product/swatch stories use and keeps
// the production Storybook build resolvable (Rollup can't resolve a bare `/images/...` import).
const sampleImage = 'https://placehold.co/200x200/e4d5b7/333333?text=Fabric';

// No router mock here: the global `withRouter` preview decorator (.storybook/preview.tsx) already
// wraps every story in a memory-router context, so SwatchGallery's `useFetcher()` resolves to a real
// idle fetcher. A module-level `vi.mock` / `vitest` import breaks the Storybook browser test-runner
// (`customEqualityTesters` is undefined there), which made the a11y/interaction runs fail to load
// this story. The play functions below never submit, so the idle fetcher is sufficient.

const SAMPLE_IMAGE_GROUPS: ShopperProducts.schemas['Product']['imageGroups'] = [
    { viewType: 'large', images: [{ link: sampleImage, alt: 'Fabric swatch sample' }] },
];

// The fabric family lives in a custom attribute the SCAPI Product type doesn't declare.
type SwatchProduct = ShopperProducts.schemas['Product'] & { c_fabricFamily?: string };

const mockSwatchProducts: SwatchProduct[] = [
    {
        id: 'fabric-swatch-slate-linen',
        name: 'Slate Gray',
        c_fabricFamily: 'Linen',
        imageGroups: SAMPLE_IMAGE_GROUPS,
        price: 0,
    },
    {
        id: 'fabric-swatch-sage-linen',
        name: 'Sage',
        c_fabricFamily: 'Linen',
        imageGroups: SAMPLE_IMAGE_GROUPS,
        price: 0,
    },
    {
        id: 'fabric-swatch-navy-velvet',
        name: 'Navy',
        c_fabricFamily: 'Velvet',
        imageGroups: SAMPLE_IMAGE_GROUPS,
        price: 0,
    },
    {
        id: 'fabric-swatch-rust-velvet',
        name: 'Rust',
        c_fabricFamily: 'Velvet',
        imageGroups: SAMPLE_IMAGE_GROUPS,
        price: 0,
    },
    {
        id: 'fabric-swatch-charcoal-leather',
        name: 'Charcoal',
        c_fabricFamily: 'Leather',
        imageGroups: SAMPLE_IMAGE_GROUPS,
        price: 0,
    },
    {
        id: 'fabric-swatch-ivory-performance',
        name: 'Ivory',
        c_fabricFamily: 'Performance',
        imageGroups: SAMPLE_IMAGE_GROUPS,
        price: 0,
    },
];

const meta: Meta<typeof SwatchGallery> = {
    title: 'Furniture/Swatch Gallery',
    component: SwatchGallery,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Browse and select free fabric swatches. Registered customers can order up to 5 samples that are added to their cart as free $0 items.',
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    render: () => (
        <SwatchGallery
            swatchProducts={mockSwatchProducts}
            alreadyOrdered={false}
            initialSelection={[]}
            maxDistinctSwatches={5}
        />
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Slate Gray')).toBeInTheDocument();
        await expect(canvas.getByText('Navy')).toBeInTheDocument();
        await expect(canvas.getByText('0 of 5 selected')).toBeInTheDocument();
    },
};

export const WithSelection: Story = {
    render: () => (
        <SwatchGallery
            swatchProducts={mockSwatchProducts}
            alreadyOrdered={false}
            initialSelection={['fabric-swatch-slate-linen', 'fabric-swatch-navy-velvet']}
            maxDistinctSwatches={5}
        />
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('2 of 5 selected')).toBeInTheDocument();
        await expect(canvas.getByRole('checkbox', { name: 'Slate Gray, Linen' })).toHaveAttribute(
            'aria-checked',
            'true'
        );
        await expect(canvas.getByRole('checkbox', { name: 'Navy, Velvet' })).toHaveAttribute('aria-checked', 'true');
    },
};

export const AlreadyOrdered: Story = {
    render: () => (
        <SwatchGallery
            swatchProducts={mockSwatchProducts}
            alreadyOrdered={true}
            initialSelection={[]}
            maxDistinctSwatches={5}
        />
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        await expect(canvas.getByText('Swatches ordered')).toBeInTheDocument();
        await expect(canvas.queryByText('Order Free Swatches')).not.toBeInTheDocument();
    },
};

export const MaxSelection: Story = {
    render: () => (
        <SwatchGallery
            swatchProducts={mockSwatchProducts}
            alreadyOrdered={false}
            initialSelection={[]}
            maxDistinctSwatches={5}
        />
    ),
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);

        // Select 5 swatches (the max)
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Slate Gray, Linen' }));
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Sage, Linen' }));
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Navy, Velvet' }));
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Rust, Velvet' }));
        await userEvent.click(canvas.getByRole('checkbox', { name: 'Charcoal, Leather' }));

        await expect(canvas.getByText('5 of 5 selected')).toBeInTheDocument();

        // The 6th checkbox should be disabled
        const sixthCheckbox = canvas.getByRole('checkbox', { name: 'Ivory, Performance' });
        await expect(sixthCheckbox).toBeDisabled();
    },
};
