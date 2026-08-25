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
import { Suspense, useState, useEffect } from 'react';
import { Await } from 'react-router';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/currency';
import { useTranslation } from 'react-i18next';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';
import type { ServiceAddon } from '../../lib/service-addons.server';

interface AvailableServicesProps {
    servicesPromise: Promise<ServiceAddon[]>;
    onSelectionChange: (items: { productId: string; quantity: number; price: number }[]) => void;
}

/**
 * Displays a checkbox list of optional service add-ons (e.g. assembly, delivery, disposal)
 * that the shopper can select to add alongside the main product. The selected services are
 * reported up to the furniture ProductView overlay via onSelectionChange, which then passes
 * them as additionalItems to ProductCartActions.
 */
export default function AvailableServices({ servicesPromise, onSelectionChange }: AvailableServicesProps) {
    return (
        <Suspense fallback={null}>
            <Await resolve={servicesPromise}>
                {(services: ServiceAddon[]) => {
                    if (!services.length) return null;
                    return <ServicesCard services={services} onSelectionChange={onSelectionChange} />;
                }}
            </Await>
        </Suspense>
    );
}

function ServicesCard({
    services,
    onSelectionChange,
}: {
    services: ServiceAddon[];
    onSelectionChange: (items: { productId: string; quantity: number; price: number }[]) => void;
}) {
    const { t } = useTranslation('product');
    const { site } = useSite();
    const locale = site.defaultLocale;
    const [checkedIds, setCheckedIds] = useState<string[]>([]);

    // Notify parent whenever the checked set changes.
    useEffect(() => {
        const selectedItems = services
            .filter((service) => checkedIds.includes(service.id))
            .map((service) => ({
                productId: service.id,
                quantity: 1,
                price: service.price,
            }));
        onSelectionChange(selectedItems);
    }, [checkedIds, services, onSelectionChange]);

    const isChecked = (id: string) => checkedIds.includes(id);
    const toggleChecked = (id: string) => {
        setCheckedIds((prev) => (prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]));
    };

    const servicesTotal = services
        .filter((service) => checkedIds.includes(service.id))
        .reduce((sum, service) => sum + service.price, 0);

    // Assume all services share the same currency (they're from the same catalog).
    const currency = services[0]?.currency ?? 'USD';

    return (
        <Card data-slot="available-services" className="mt-6 p-4 space-y-4">
            <h3 className="font-semibold">{t('availableServices')}</h3>
            <div className="space-y-3">
                {services.map((service) => (
                    <label key={service.id} data-slot="service-addon" className="flex items-start gap-3 cursor-pointer">
                        <Checkbox
                            id={service.id}
                            checked={isChecked(service.id)}
                            onCheckedChange={() => toggleChecked(service.id)}
                            aria-label={service.name}
                        />
                        <div className="flex-1">
                            <div className="flex justify-between items-baseline">
                                <span className="font-medium">{service.name}</span>
                                <span className="text-sm">{formatCurrency(service.price, locale, currency)}</span>
                            </div>
                            {service.description && (
                                <p className="text-sm text-muted-foreground mt-1">{service.description}</p>
                            )}
                        </div>
                    </label>
                ))}
            </div>
            {checkedIds.length > 0 && (
                <div className="flex justify-between font-semibold pt-3 border-t">
                    <span>{t('servicesTotal')}:</span>
                    <span data-slot="service-addon-total">{formatCurrency(servicesTotal, locale, currency)}</span>
                </div>
            )}
        </Card>
    );
}
