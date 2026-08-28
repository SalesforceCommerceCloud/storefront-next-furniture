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
import { expect, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import type { ShopperProducts } from '@/scapi';
import ProductBottomBar from './product-bottom-bar';
import ProductViewProvider from '@/providers/product-view';
import { ConfigProvider } from '@salesforce/storefront-next-runtime/config';
import { SiteProvider } from '@salesforce/storefront-next-runtime/site-context';
import { mockConfig, mockLocale, mockSiteObject } from '@/test-utils/config';

/**
 * ProductBottomBar is the furniture PDP's sticky bar. It slides up when the relevant anchor scrolls
 * above the viewport and mirrors the main Add-to-Cart button.
 *
 * Two states:
 * - **Variant resolved / no variants**: CTA is "Add to Cart"; the bar tracks the main
 *   `[data-slot="add-to-cart-button"]`.
 * - **Variant not yet chosen**: CTA is "Choose Options" (enabled) and scrolls the first variant
 *   attribute into view; the bar tracks the `[data-slot="swatch-container"]`.
 */
const meta: Meta<typeof ProductBottomBar> = {
    title: 'Products/Product Bottom Bar',
    component: ProductBottomBar,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story: React.ComponentType, context) => {
            const product = context.args.product || createMockProduct();
            return (
                <ConfigProvider config={mockConfig}>
                    <SiteProvider
                        site={mockSiteObject}
                        locale={mockLocale}
                        language={mockSiteObject.defaultLocale}
                        currency={mockSiteObject.defaultCurrency}>
                        <ProductViewProvider product={product} mode="add">
                            <div className="min-h-screen bg-background">
                                <Story />
                            </div>
                        </ProductViewProvider>
                    </SiteProvider>
                </ConfigProvider>
            );
        },
    ],
    argTypes: {
        product: { description: 'Product data to display in the bottom bar', control: false },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

const createMockProduct = (
    overrides?: Partial<ShopperProducts.schemas['Product']>
): ShopperProducts.schemas['Product'] => ({
    id: 'furniture-product-123',
    name: 'Aria Linen Sofa',
    currency: 'GBP',
    price: 1299,
    imageGroups: [
        {
            viewType: 'large',
            images: [
                {
                    link: 'https://via.placeholder.com/400x400/EDE7DD/2B2B2B?text=Aria+Linen+Sofa',
                    alt: 'Aria Linen Sofa',
                },
            ],
        },
    ],
    ...overrides,
});

// Master product with an unresolved variant → drives the "Choose Options" state.
const createMockMasterProduct = (): ShopperProducts.schemas['Product'] => ({
    ...createMockProduct({ id: 'furniture-master-123', name: 'Aria Modular Sofa', price: 1499 }),
    type: { master: true },
    variationAttributes: [
        {
            id: 'fabric',
            name: 'Fabric',
            values: [
                { value: 'linen', name: 'Linen' },
                { value: 'velvet', name: 'Velvet' },
            ],
        },
    ],
    variants: [
        { productId: 'v-linen', variationValues: { fabric: 'linen' } },
        { productId: 'v-velvet', variationValues: { fabric: 'velvet' } },
    ],
});

/**
 * Variant resolved → the bar shows product info and an Add to Cart button.
 */
export const Visible: Story = {
    render: () => {
        const product = createMockProduct();
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">{product.name}</h1>
                    <button type="button" data-slot="add-to-cart-button" className="hidden">
                        Main Button
                    </button>
                </div>
                <ProductBottomBar product={product} />
            </div>
        );
    },
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const bar = canvasElement.querySelector('[data-slot="product-bottom-bar"]');
        await expect(bar).toBeInTheDocument();
        const canvas = within(bar as HTMLElement);
        await expect(canvas.getByRole('button', { name: /add to cart/i })).toBeInTheDocument();
    },
};

/**
 * Product with a sale price shows the discounted price in the bar.
 */
export const WithSalePrice: Story = {
    render: () => {
        const product = createMockProduct({ price: 999, priceMax: 1299 });
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">{product.name}</h1>
                    <button type="button" data-slot="add-to-cart-button" className="hidden">
                        Main Button
                    </button>
                </div>
                <ProductBottomBar product={product} />
            </div>
        );
    },
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const bar = canvasElement.querySelector('[data-slot="product-bottom-bar"]');
        await expect(bar).toBeInTheDocument();
    },
};

/**
 * Long product name truncates to prevent layout overflow.
 */
export const LongProductName: Story = {
    render: () => {
        const product = createMockProduct({
            name: 'Aria Extra-Deep Modular Corner Sofa with Chaise, Feather-Wrapped Cushions and Solid Oak Legs',
        });
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">{product.name}</h1>
                    <button type="button" data-slot="add-to-cart-button" className="hidden">
                        Main Button
                    </button>
                </div>
                <ProductBottomBar product={product} />
            </div>
        );
    },
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const bar = canvasElement.querySelector('[data-slot="product-bottom-bar"]');
        const name = bar?.querySelector('p.truncate');
        await expect(name).toBeTruthy();
        await expect(name).toHaveClass('truncate');
    },
};

/**
 * Master product with no variant chosen → CTA reads "Choose Options" and tracks the swatch container.
 */
export const ChooseOptions: Story = {
    args: { product: createMockMasterProduct() },
    render: (args) => (
        <div className="min-h-screen p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-bold mb-8">{args.product.name}</h1>
                <div data-slot="swatch-container" className="space-y-3">
                    <div className="rounded-ui border border-border p-4">Fabric</div>
                    <div className="rounded-ui border border-border p-4">Size</div>
                </div>
            </div>
            <ProductBottomBar product={args.product} />
        </div>
    ),
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const bar = canvasElement.querySelector('[data-slot="product-bottom-bar"]');
        await expect(bar).toBeInTheDocument();
        const canvas = within(bar as HTMLElement);
        const button = canvas.getByRole('button', { name: /choose options/i });
        await expect(button).toBeInTheDocument();
        await expect(button).toBeEnabled();
    },
};

/**
 * Fixed positioning is core to the mobile layout.
 */
export const ResponsiveVisibility: Story = {
    render: () => {
        const product = createMockProduct();
        return (
            <div className="min-h-screen p-6">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-8">{product.name}</h1>
                    <button type="button" data-slot="add-to-cart-button" className="hidden">
                        Main Button
                    </button>
                </div>
                <ProductBottomBar product={product} />
            </div>
        );
    },
    parameters: { viewport: { defaultViewport: 'mobile1' } },
    play: async ({ canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const bar = canvasElement.querySelector('[data-slot="product-bottom-bar"]');
        await expect(bar).toHaveClass('fixed');
        await expect(bar).toHaveClass('bottom-0');
    },
};
