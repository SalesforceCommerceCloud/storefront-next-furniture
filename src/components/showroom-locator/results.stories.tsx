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
import { expect, fn, userEvent, within } from 'storybook/test';
import { waitForStorybookReady } from '@storybook/test-utils';
import furnitureTranslations from '../../locales/en-GB/overrides';
import ShowroomResults from './results';
import type { Showroom } from './types';

const showrooms = [
    {
        id: 'downtown',
        name: 'Downtown Showroom',
        address1: '101 Market Street',
        city: 'Seattle',
        stateCode: 'WA',
        postalCode: '98101',
        phone: '206-555-0101',
        distance: 2.4,
        latitude: 47.6062,
        longitude: -122.3321,
        storeHours: 'Mon-Sat 10am-8pm\nSun 11am-6pm',
        inventoryId: 'inventory-downtown',
        c_appointmentUrl: 'https://appointments.example.com/downtown',
    },
    {
        id: 'bellevue',
        name: 'Bellevue Showroom',
        address1: '500 Bellevue Way',
        city: 'Bellevue',
        stateCode: 'WA',
        postalCode: '98004',
        phone: '425-555-0102',
        distance: 8.1,
        latitude: 47.6101,
        longitude: -122.2015,
        inventoryId: 'inventory-bellevue',
    },
    {
        id: 'tacoma',
        name: 'Tacoma Showroom',
        address1: '700 Commerce Street',
        city: 'Tacoma',
        stateCode: 'WA',
        postalCode: '98402',
        distance: 31.5,
        latitude: 47.2529,
        longitude: -122.4443,
    },
] satisfies Showroom[];

const withFurnitureTranslations = async () => {
    const { default: i18next } = await import('i18next');
    i18next.addResourceBundle('en-GB', 'showrooms', furnitureTranslations.showrooms, true, true);
};

const meta = {
    title: 'Store Locator/Furniture Showroom Results',
    component: ShowroomResults,
    tags: ['autodocs', 'interaction'],
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Furniture showroom search results built from Shopper Stores records. Product-aware visits add inventory status, while appointment controls appear only for configured external links.',
            },
        },
    },
    loaders: [withFurnitureTranslations],
    argTypes: {
        productAware: {
            control: 'boolean',
            description: 'Show product availability for each showroom inventory list.',
        },
        selectedShowroomId: {
            control: 'radio',
            options: [null, 'downtown', 'bellevue', 'tacoma'],
            description: 'Highlight the showroom selected in the list or map.',
        },
        distanceUnit: {
            control: 'radio',
            options: ['mi', 'km'],
            description: 'Unit shown beside showroom distance.',
        },
        showrooms: { table: { disable: true } },
        availability: { table: { disable: true } },
        onSelect: { table: { disable: true } },
    },
    args: {
        availability: {
            'inventory-downtown': 'available',
            'inventory-bellevue': 'unavailable',
        },
        distanceUnit: 'mi',
        mapEnabled: true,
        onSelect: fn(),
        productAware: true,
        selectedShowroomId: 'downtown',
        showrooms,
    },
} satisfies Meta<typeof ShowroomResults>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
    play: async ({ args, canvasElement }) => {
        await waitForStorybookReady(canvasElement);
        const canvas = within(canvasElement);
        await userEvent.click(canvas.getAllByRole('button', { name: 'Show on map' })[0]);
        await expect(args.onSelect).toHaveBeenCalledWith('bellevue');
    },
};
