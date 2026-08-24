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
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import ShowroomResults from '@/components/showroom-locator/results';
import type { Showroom } from '@/components/showroom-locator/types';

const translations: Record<string, string> = {
    'results.label': 'Showroom results',
    'results.showOnMap': 'Show on map',
    'results.shownOnMap': 'Shown on map',
    'availability.available': 'Available at this showroom',
    'availability.unavailable': 'Not currently available at this showroom',
    'availability.unknown': 'Availability unavailable',
    appointment: 'Book a showroom appointment',
};

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key: string) => translations[key] ?? key }),
}));

const showrooms = [
    {
        id: 'downtown',
        name: 'Downtown Showroom',
        address1: '101 Market Street',
        city: 'Seattle',
        stateCode: 'WA',
        postalCode: '98101',
        latitude: 47.6062,
        longitude: -122.3321,
        inventoryId: 'inventory-downtown',
        c_appointmentUrl: 'https://appointments.example.com/downtown',
    },
    {
        id: 'north',
        name: 'North Showroom',
        address1: '200 Pine Street',
        city: 'Seattle',
        stateCode: 'WA',
        postalCode: '98102',
        latitude: 47.623,
        longitude: -122.321,
        inventoryId: 'inventory-north',
        c_appointmentUrl: 'javascript:alert(1)',
    },
] as Showroom[];

describe('ShowroomResults', () => {
    test('renders product availability by showroom inventory and safe appointment links', () => {
        render(
            <ShowroomResults
                availability={{ 'inventory-downtown': 'available', 'inventory-north': 'unavailable' }}
                distanceUnit="mi"
                mapEnabled
                productAware
                selectedShowroomId="downtown"
                showrooms={showrooms}
                onSelect={vi.fn()}
            />
        );

        expect(screen.getByText('Available at this showroom')).toBeInTheDocument();
        expect(screen.getByText('Not currently available at this showroom')).toBeInTheDocument();
        const appointment = screen.getByRole('link', { name: /book a showroom appointment/i });
        expect(appointment).toHaveAttribute('href', 'https://appointments.example.com/downtown');
        expect(appointment).toHaveAttribute('target', '_blank');
        expect(screen.getAllByRole('link', { name: /book a showroom appointment/i })).toHaveLength(1);
    });

    test('omits availability copy without a product-aware entry point', () => {
        render(
            <ShowroomResults
                distanceUnit="mi"
                mapEnabled
                productAware={false}
                selectedShowroomId={null}
                showrooms={showrooms}
                onSelect={vi.fn()}
            />
        );

        expect(screen.queryByText('Availability unavailable')).not.toBeInTheDocument();
        expect(screen.queryByText('Available at this showroom')).not.toBeInTheDocument();
    });

    test('selects a showroom from the accessible list', async () => {
        const onSelect = vi.fn();
        render(
            <ShowroomResults
                distanceUnit="mi"
                mapEnabled
                productAware={false}
                selectedShowroomId={null}
                showrooms={showrooms}
                onSelect={onSelect}
            />
        );

        await userEvent.click(screen.getAllByRole('button', { name: 'Show on map' })[0]);
        expect(onSelect).toHaveBeenCalledWith('downtown');
    });

    test('omits map controls when no usable map target exists', () => {
        const { rerender } = render(
            <ShowroomResults
                distanceUnit="mi"
                mapEnabled={false}
                productAware={false}
                selectedShowroomId="downtown"
                showrooms={showrooms}
                onSelect={vi.fn()}
            />
        );

        expect(screen.queryByRole('button', { name: /map/i })).not.toBeInTheDocument();

        rerender(
            <ShowroomResults
                distanceUnit="mi"
                mapEnabled
                productAware={false}
                selectedShowroomId="downtown"
                showrooms={[{ ...showrooms[0], latitude: undefined, longitude: undefined }]}
                onSelect={vi.fn()}
            />
        );

        expect(screen.queryByRole('button', { name: /map/i })).not.toBeInTheDocument();
    });
});
