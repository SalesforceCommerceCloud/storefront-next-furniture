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
import type { ShopperProducts } from '@/scapi';
import type { ParseKeys } from 'i18next';
import type { SectionContent, SpecTableRow } from '@/components/html-fragment/types';

type TranslatorFn = (key: string, options?: { count?: number }) => string;

export type PdpSection =
    | { apiMethod: string; labelKey: ParseKeys<'product'> }
    | {
          resolve: (product: ShopperProducts.schemas['Product'], t: TranslatorFn) => Promise<SectionContent | null>;
          labelKey: ParseKeys<'product'>;
      };

/**
 * Escapes HTML special characters to prevent XSS.
 */
function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Builds a 2-column table HTML string from label-value pairs.
 */
function buildRows(pairs: [string, string][]): string {
    if (pairs.length === 0) return '';

    const rows = pairs
        .map(([label, value]) => {
            const escapedLabel = escapeHtml(label);
            const escapedValue = escapeHtml(value);
            return `<tr style="border: none;"><td style="font-weight: normal">${escapedLabel}:</td><td style="text-align: right">${escapedValue}</td></tr>`;
        })
        .join('');

    return `<table style="border: none;">${rows}</table>`;
}

/**
 * Returns the ordered list of collapsible sections to render on the furniture PDP.
 * Each section resolves from product c_* attributes with i18n labels.
 */
export function resolvePdpSections(product: ShopperProducts.schemas['Product']): PdpSection[] {
    const p = product as Record<string, unknown>;

    const sections: PdpSection[] = [];

    // Dimensions section — include if c_width is set. Emits structured spec-table content so the value
    // column can switch between imperial and metric (both provisioned in the dataset — no conversion).
    // The metric view only appears when metric partner attributes exist, so it degrades to a plain
    // single-view table before the dual-unit dataset is imported.
    const hasDimensions = typeof p.c_width === 'number' || typeof p.c_width === 'string';
    if (hasDimensions) {
        sections.push({
            labelKey: 'dimensions',
            // oxlint-disable-next-line @typescript-eslint/require-await -- async for the resolve() Promise contract; body is synchronous
            resolve: async (prod: ShopperProducts.schemas['Product'], t: TranslatorFn) => {
                const pr = prod as Record<string, unknown>;
                const lengthUnit =
                    typeof pr.c_dimensionUnit === 'string' && pr.c_dimensionUnit ? pr.c_dimensionUnit : 'in';
                const rows: SpecTableRow[] = [];
                let hasMetric = false;

                const addLength = (labelKey: ParseKeys<'product'>, imperialKey: string, metricKey: string) => {
                    const imperial = pr[imperialKey];
                    if (typeof imperial !== 'number') return;
                    const values: Record<string, string> = { imperial: `${imperial} ${lengthUnit}` };
                    const metric = pr[metricKey];
                    if (typeof metric === 'number') {
                        values.metric = `${metric} cm`;
                        hasMetric = true;
                    }
                    rows.push({ label: t(labelKey), values });
                };

                addLength('furnitureSpec.width', 'c_width', 'c_widthCm');
                addLength('furnitureSpec.depth', 'c_depth', 'c_depthCm');
                addLength('furnitureSpec.height', 'c_height', 'c_heightCm');
                addLength('furnitureSpec.seatHeight', 'c_seatHeight', 'c_seatHeightCm');
                addLength('furnitureSpec.armHeight', 'c_armHeight', 'c_armHeightCm');

                if (typeof pr.c_weight === 'number') {
                    const values: Record<string, string> = { imperial: `${pr.c_weight} lbs` };
                    if (typeof pr.c_weightKg === 'number') {
                        values.metric = `${pr.c_weightKg} kg`;
                        hasMetric = true;
                    }
                    rows.push({ label: t('furnitureSpec.weight'), values });
                }

                if (rows.length === 0) return null;

                return {
                    contentType: 'spec-table',
                    rows,
                    views: hasMetric
                        ? [
                              { id: 'imperial', label: t('measurements.imperial') },
                              { id: 'metric', label: t('measurements.metric') },
                          ]
                        : undefined,
                    defaultViewId: 'imperial',
                    viewSwitchLabel: t('measurements.units'),
                };
            },
        });
    }

    // Assembly section — include if c_assemblyRequired is a boolean
    const hasAssembly = typeof p.c_assemblyRequired === 'boolean';
    if (hasAssembly) {
        sections.push({
            labelKey: 'assembly',
            // oxlint-disable-next-line @typescript-eslint/require-await -- async for the resolve() Promise contract; body is synchronous
            resolve: async (prod: ShopperProducts.schemas['Product'], t: TranslatorFn) => {
                const pr = prod as Record<string, unknown>;
                const pairs: [string, string][] = [];

                if (typeof pr.c_assemblyRequired === 'boolean') {
                    const value = pr.c_assemblyRequired ? t('furnitureSpec.yes') : t('furnitureSpec.no');
                    pairs.push([t('furnitureSpec.assemblyRequired'), value]);
                }
                if (typeof pr.c_assemblyDifficulty === 'string' && pr.c_assemblyDifficulty) {
                    pairs.push([t('furnitureSpec.difficulty'), pr.c_assemblyDifficulty]);
                }
                if (typeof pr.c_assemblyTime === 'number') {
                    const timeValue = t('furnitureSpec.minutes', { count: pr.c_assemblyTime });
                    pairs.push([t('furnitureSpec.assemblyTime'), timeValue]);
                }
                if (typeof pr.c_assemblyTools === 'string' && pr.c_assemblyTools) {
                    pairs.push([t('furnitureSpec.tools'), pr.c_assemblyTools]);
                }

                if (pairs.length === 0) return null;

                return {
                    html: buildRows(pairs),
                    contentType: 'table-2-column',
                };
            },
        });
    }

    // Materials section — include if any of the material c_* are set
    const hasMaterials =
        (typeof p.c_materialFrame === 'string' && p.c_materialFrame) ||
        (typeof p.c_materialFill === 'string' && p.c_materialFill) ||
        (typeof p.c_materialUpholstery === 'string' && p.c_materialUpholstery);

    if (hasMaterials) {
        sections.push({
            labelKey: 'materials',
            // oxlint-disable-next-line @typescript-eslint/require-await -- async for the resolve() Promise contract; body is synchronous
            resolve: async (prod: ShopperProducts.schemas['Product'], t: TranslatorFn) => {
                const pr = prod as Record<string, unknown>;
                const pairs: [string, string][] = [];

                if (typeof pr.c_materialFrame === 'string' && pr.c_materialFrame) {
                    pairs.push([t('furnitureSpec.frame'), pr.c_materialFrame]);
                }
                if (typeof pr.c_materialFill === 'string' && pr.c_materialFill) {
                    pairs.push([t('furnitureSpec.fill'), pr.c_materialFill]);
                }
                if (typeof pr.c_materialUpholstery === 'string' && pr.c_materialUpholstery) {
                    pairs.push([t('furnitureSpec.upholstery'), pr.c_materialUpholstery]);
                }

                if (pairs.length === 0) return null;

                return {
                    html: buildRows(pairs),
                    contentType: 'table-2-column',
                };
            },
        });
    }

    // Specifications section — aggregate dimensions + materials
    const hasSpecifications = hasDimensions || hasMaterials;
    if (hasSpecifications) {
        sections.push({
            labelKey: 'specifications',
            // oxlint-disable-next-line @typescript-eslint/require-await -- async for the resolve() Promise contract; body is synchronous
            resolve: async (prod: ShopperProducts.schemas['Product'], t: TranslatorFn) => {
                const pr = prod as Record<string, unknown>;
                const lengthUnit =
                    typeof pr.c_dimensionUnit === 'string' && pr.c_dimensionUnit ? pr.c_dimensionUnit : 'in';
                let hasMetric = false;

                // Dimensions subsection — per-view rows (imperial + metric), same as the Dimensions section,
                // so the shared Imperial/Metric switch flips these values. Metric only when present.
                const dimensionRows: SpecTableRow[] = [];
                const addLength = (labelKey: ParseKeys<'product'>, imperialKey: string, metricKey: string) => {
                    const imperial = pr[imperialKey];
                    if (typeof imperial !== 'number') return;
                    const values: Record<string, string> = { imperial: `${imperial} ${lengthUnit}` };
                    const metric = pr[metricKey];
                    if (typeof metric === 'number') {
                        values.metric = `${metric} cm`;
                        hasMetric = true;
                    }
                    dimensionRows.push({ label: t(labelKey), values });
                };
                addLength('furnitureSpec.width', 'c_width', 'c_widthCm');
                addLength('furnitureSpec.depth', 'c_depth', 'c_depthCm');
                addLength('furnitureSpec.height', 'c_height', 'c_heightCm');
                addLength('furnitureSpec.seatHeight', 'c_seatHeight', 'c_seatHeightCm');
                addLength('furnitureSpec.armHeight', 'c_armHeight', 'c_armHeightCm');
                if (typeof pr.c_weight === 'number') {
                    const values: Record<string, string> = { imperial: `${pr.c_weight} lbs` };
                    if (typeof pr.c_weightKg === 'number') {
                        values.metric = `${pr.c_weightKg} kg`;
                        hasMetric = true;
                    }
                    dimensionRows.push({ label: t('furnitureSpec.weight'), values });
                }

                // Materials subsection — unit-agnostic single-value rows (a single view id; the switch's
                // value fallback keeps them static when the shopper flips to metric).
                const materialRows: SpecTableRow[] = [];
                const addMaterial = (labelKey: ParseKeys<'product'>, value: unknown) => {
                    if (typeof value === 'string' && value)
                        materialRows.push({ label: t(labelKey), values: { imperial: value } });
                };
                addMaterial('furnitureSpec.frame', pr.c_materialFrame);
                addMaterial('furnitureSpec.fill', pr.c_materialFill);
                addMaterial('furnitureSpec.upholstery', pr.c_materialUpholstery);

                const groups = [];
                if (dimensionRows.length) groups.push({ heading: t('dimensions'), rows: dimensionRows });
                if (materialRows.length) groups.push({ heading: t('materials'), rows: materialRows });
                if (groups.length === 0) return null;

                return {
                    contentType: 'spec-table',
                    groups,
                    views: hasMetric
                        ? [
                              { id: 'imperial', label: t('measurements.imperial') },
                              { id: 'metric', label: t('measurements.metric') },
                          ]
                        : undefined,
                    defaultViewId: 'imperial',
                    viewSwitchLabel: t('measurements.units'),
                };
            },
        });
    }

    return sections;
}
