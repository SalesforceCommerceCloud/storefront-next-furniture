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
import type { LoaderFunctionArgs } from 'react-router';
import { fetchProductById } from '@/lib/api/products.server';
import { getLogger } from '@/lib/logger.server';

export interface ServiceAddon {
    id: string;
    name: string;
    price: number;
    currency: string;
    description?: string;
}

/**
 * Fetches add-on service products (e.g. assembly, delivery, disposal) from the catalog.
 * Service products are minimal SKUs with a price and description — they don't require
 * expanded fields like images or variations, so we keep the fetch lean.
 *
 * `currency` is forwarded to SCAPI so service prices resolve in the same currency as the main
 * product price on a multi-currency site; omit it to use the site default.
 */
export async function fetchServiceAddons(
    context: LoaderFunctionArgs['context'],
    serviceIds: string[],
    currency?: string
): Promise<ServiceAddon[]> {
    const logger = getLogger(context);

    const results = await Promise.allSettled(
        serviceIds.map(async (id) => {
            const product = await fetchProductById(context, id, {
                expand: ['prices'],
                ...(currency ? { currency } : {}),
            });
            if (!product) return null;

            const price = product.price ?? 0;
            const productCurrency = product.currency ?? 'USD';

            return {
                id: product.id,
                name: product.name ?? id,
                price,
                currency: productCurrency,
                description: product.shortDescription ?? undefined,
            };
        })
    );

    const services: ServiceAddon[] = results
        .map((result) => (result.status === 'fulfilled' ? result.value : null))
        .filter((service): service is NonNullable<typeof service> => service !== null);

    if (services.length < serviceIds.length) {
        logger.warn('Some service add-on products failed to load', {
            requested: serviceIds.length,
            resolved: services.length,
        });
    }

    return services;
}
