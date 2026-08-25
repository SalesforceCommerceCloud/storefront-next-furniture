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
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, test, expect, vi } from 'vitest';
import AvailableServices from './available-services';
import type { ServiceAddon } from '../../lib/service-addons.server';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en-GB' } }),
}));

vi.mock('@salesforce/storefront-next-runtime/site-context', async (importOriginal) => {
    const actual = await importOriginal<object>();
    return {
        ...actual,
        useSite: vi.fn(() => ({
            site: { id: 'furniture', defaultLocale: 'en-GB' },
            language: 'en-GB',
            currency: 'GBP',
        })),
    };
});

const services: ServiceAddon[] = [
    {
        id: 'FNXT-SVC-WHITE-GLOVE-149',
        name: 'White Glove Delivery',
        price: 149,
        currency: 'GBP',
        description: 'Placement + unpack.',
    },
    { id: 'FNXT-SVC-ASSEMBLY-99', name: 'Assembly', price: 99, currency: 'GBP' },
];

function renderServices(servicesPromise: Promise<ServiceAddon[]>, onSelectionChange = vi.fn()) {
    const router = createMemoryRouter(
        [
            {
                path: '/',
                element: <AvailableServices servicesPromise={servicesPromise} onSelectionChange={onSelectionChange} />,
            },
        ],
        { initialEntries: ['/'] }
    );
    render(<RouterProvider router={router} />);
    return { onSelectionChange };
}

describe('AvailableServices', () => {
    test('renders nothing when no services resolve', async () => {
        renderServices(Promise.resolve([]));
        await waitFor(() => {
            expect(document.querySelector('[data-slot="available-services"]')).not.toBeInTheDocument();
        });
    });

    test('renders a checkbox row per service with name + price', async () => {
        renderServices(Promise.resolve(services));
        await screen.findByText('White Glove Delivery');
        expect(screen.getByText('Assembly')).toBeInTheDocument();
        expect(document.querySelectorAll('[data-slot="service-addon"]')).toHaveLength(2);
        expect(screen.getByText((c) => c.includes('149'))).toBeInTheDocument();
    });

    test('reports the selected service up via onSelectionChange when toggled', async () => {
        const user = userEvent.setup();
        const { onSelectionChange } = renderServices(Promise.resolve(services));
        const checkbox = await screen.findByRole('checkbox', { name: 'White Glove Delivery' });

        await user.click(checkbox);

        await waitFor(() => {
            expect(onSelectionChange).toHaveBeenLastCalledWith([
                { productId: 'FNXT-SVC-WHITE-GLOVE-149', quantity: 1, price: 149 },
            ]);
        });
        // Services total appears once something is checked
        expect(document.querySelector('[data-slot="service-addon-total"]')).toBeInTheDocument();
    });
});
