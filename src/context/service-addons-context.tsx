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

import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import type { AdditionalItem } from '@/components/product-cart-actions';

/**
 * Shared "selected service add-ons" state for the furniture PDP.
 *
 * The add-ons are chosen in `AvailableServices` (inside `ProductView`) but must also be read by the
 * route-level `ProductBottomBar`, which renders as a sibling of `ProductView` so its `fixed`
 * positioning is viewport-relative (mounting it inside the ProductView content flow makes it render
 * clipped). Lifting the selection into this context lets both the main `ProductCartActions` button
 * and the bottom bar batch the same add-ons into Add-to-Cart without prop-drilling through the
 * route → ProductContent → ProductView chain.
 */
interface ServiceAddonsContextValue {
    additionalItems: AdditionalItem[];
    setAdditionalItems: (items: AdditionalItem[]) => void;
}

const ServiceAddonsContext = createContext<ServiceAddonsContextValue | null>(null);

interface ServiceAddonsProviderProps {
    /**
     * Master product id. Selected add-ons reset when it changes, since a different product exposes
     * different services. Variant (`pid`) changes keep the same id, so a shopper's selection
     * survives colour/size switches within one product — matching the prior in-ProductView behavior.
     */
    productId: string;
}

export default function ServiceAddonsProvider({ productId, children }: PropsWithChildren<ServiceAddonsProviderProps>) {
    const [additionalItems, setAdditionalItems] = useState<AdditionalItem[]>([]);

    // Clear the selection when navigating to a different product.
    useEffect(() => {
        setAdditionalItems([]);
    }, [productId]);

    return (
        <ServiceAddonsContext.Provider value={{ additionalItems, setAdditionalItems }}>
            {children}
        </ServiceAddonsContext.Provider>
    );
}

/**
 * Read the shared add-ons state. Returns `null` when rendered outside a `ServiceAddonsProvider`
 * (e.g. `ProductView` in isolation in tests/Storybook), so callers can fall back to local state.
 */
// oxlint-disable-next-line react-refresh/only-export-components
export function useOptionalServiceAddons(): ServiceAddonsContextValue | null {
    return useContext(ServiceAddonsContext);
}
