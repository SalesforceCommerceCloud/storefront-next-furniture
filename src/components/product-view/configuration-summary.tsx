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
import { useProductView } from '@/providers/product-view';
import { formatCurrency } from '@/lib/currency';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { useSite } from '@salesforce/storefront-next-runtime/site-context';

/**
 * Shows a "Your Configuration" summary of the selected variation values and total price.
 * Only renders when a full variant is selected (all variation axes have values), so it
 * self-gates and the parent doesn't need a conditional. Used by the furniture vertical
 * to display the selected size + fabric + leg style above the Add-to-Cart button.
 */
export default function ConfigurationSummary() {
    const { t } = useTranslation('product');
    const { product, currentVariant } = useProductView();
    const { site } = useSite();
    const locale = site.defaultLocale;

    // Only show when a full variant is selected.
    if (!currentVariant) return null;

    const price = currentVariant.price ?? product.price ?? 0;
    const currency = product.currency ?? 'USD';

    // Collect the selected variation values to display in the summary.
    const selectedOptions =
        product.variationAttributes
            ?.map((attr) => {
                const selectedValue = currentVariant.variationValues?.[attr.id];
                if (!selectedValue) return null;

                const valueObj = attr.values?.find((v) => v.value === selectedValue);
                const displayName = valueObj?.name ?? selectedValue;

                return {
                    label: attr.name ?? attr.id,
                    value: displayName,
                };
            })
            .filter(Boolean) ?? [];

    return (
        <Card data-slot="configuration-summary" className="mb-4 p-4 space-y-2">
            <h3 className="font-semibold">{t('yourConfiguration')}</h3>
            <div className="space-y-1 text-sm">
                {selectedOptions.map((option) => (
                    <div key={option?.label} className="flex justify-between">
                        <span className="text-muted-foreground">{option?.label}:</span>
                        <span>{option?.value}</span>
                    </div>
                ))}
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t">
                <span>{t('total')}:</span>
                <span data-slot="configuration-total">{formatCurrency(price, locale, currency)}</span>
            </div>
        </Card>
    );
}
