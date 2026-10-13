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
import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useFetcher } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { ShopperProducts } from '@/scapi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Typography } from '@/components/typography';
import { DynamicImage } from '@/components/dynamic-image';
import { cn } from '@/lib/utils';

interface SwatchGalleryProps {
    swatchProducts: ShopperProducts.schemas['Product'][];
    alreadyOrdered: boolean;
    initialSelection: string[];
    maxDistinctSwatches: number;
}

export default function SwatchGallery({
    swatchProducts,
    alreadyOrdered,
    initialSelection,
    maxDistinctSwatches,
}: SwatchGalleryProps): ReactElement {
    const { t } = useTranslation('swatches');
    const fetcher = useFetcher();
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(initialSelection));

    // Mirror the checkbox selection to the basket's current swatch set whenever that set actually
    // changes — after this page's own submit AND after an external basket edit (e.g. removing a
    // swatch from the mini-cart, which revalidates this loader). Keyed on content (sorted ids) so an
    // identity-only revalidation with an unchanged cart never clobbers an in-progress selection.
    const basketSelectionKey = [...initialSelection].sort().join('|');
    const syncedKeyRef = useRef(basketSelectionKey);
    useEffect(() => {
        if (basketSelectionKey !== syncedKeyRef.current) {
            syncedKeyRef.current = basketSelectionKey;
            setSelectedIds(new Set(initialSelection));
        }
    }, [basketSelectionKey, initialSelection]);

    const atMaxSelection = selectedIds.size >= maxDistinctSwatches;

    const toggleProduct = useCallback(
        (productId: string) => {
            setSelectedIds((current) => {
                const next = new Set(current);
                if (next.has(productId)) {
                    next.delete(productId);
                } else if (next.size < maxDistinctSwatches) {
                    next.add(productId);
                }
                return next;
            });
        },
        [maxDistinctSwatches]
    );

    const handleSubmit = useCallback(() => {
        const selectedProductIds = Array.from(selectedIds);
        void fetcher.submit(
            { selectedProductIds: JSON.stringify(selectedProductIds) },
            { method: 'POST', action: '/action/swatch-order' }
        );
    }, [selectedIds, fetcher]);

    const isSubmitting = fetcher.state !== 'idle';

    if (alreadyOrdered) {
        return (
            <Card className="border-border bg-background p-6">
                <Typography variant="h3" className="text-card-foreground">
                    {t('alreadyOrdered.heading')}
                </Typography>
                <Typography as="p" className="mt-2 text-sm leading-5 text-muted-foreground">
                    {t('alreadyOrdered.body')}
                </Typography>
            </Card>
        );
    }

    return (
        <section data-slot="swatch-gallery" className="w-full">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h3 className="text-base font-semibold text-foreground">{t('gallery.heading')}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {t('gallery.selectHint', { max: maxDistinctSwatches })}
                    </p>
                </div>
                <p
                    className="shrink-0 text-xs font-medium text-muted-foreground"
                    aria-live="polite"
                    data-slot="swatch-counter">
                    {t('gallery.selectedCount', { count: selectedIds.size, max: maxDistinctSwatches })}
                </p>
            </div>

            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-label={t('gallery.heading')}>
                {swatchProducts.map((product) => {
                    const checked = selectedIds.has(product.id);
                    const disabled = !checked && atMaxSelection;
                    const image = product.imageGroups?.[0]?.images?.[0];
                    // Fabric family (e.g. "Linen") lives in a dedicated custom attribute on the
                    // swatch product; the SCAPI Product type has no c_ index signature, so cast.
                    const family = (product as { c_fabricFamily?: string }).c_fabricFamily;
                    return (
                        <li key={product.id}>
                            <button
                                type="button"
                                role="checkbox"
                                aria-checked={checked}
                                aria-label={family ? `${product.name}, ${family}` : (product.name ?? product.id)}
                                disabled={disabled}
                                onClick={() => toggleProduct(product.id)}
                                data-slot="swatch-gallery-item"
                                data-selected={checked || undefined}
                                className={cn(
                                    'group flex w-full flex-col gap-1 text-left',
                                    disabled && 'cursor-not-allowed opacity-40'
                                )}>
                                <span
                                    className={cn(
                                        'relative aspect-square w-full overflow-hidden rounded-ui border-2 bg-muted transition-colors',
                                        checked
                                            ? 'border-primary ring-2 ring-primary/30'
                                            : 'border-border group-hover:border-primary/60'
                                    )}>
                                    {image?.link && (
                                        <DynamicImage
                                            src={image.link}
                                            alt={image.alt ?? product.name ?? ''}
                                            widths={[128, 256]}
                                            className="h-full w-full object-cover"
                                        />
                                    )}
                                    {checked && (
                                        <span
                                            data-slot="swatch-selected-check"
                                            className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                                            <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                                        </span>
                                    )}
                                </span>
                                <span className="truncate text-xs font-medium text-foreground">{product.name}</span>
                                {family && (
                                    <span className="truncate text-[0.6875rem] text-muted-foreground">{family}</span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>

            <Button
                type="button"
                className="mt-5 w-full sm:w-auto"
                onClick={handleSubmit}
                disabled={selectedIds.size === 0 || isSubmitting}
                data-slot="swatch-submit">
                {isSubmitting ? t('form.submitting') : t('form.submit')}
            </Button>
        </section>
    );
}
