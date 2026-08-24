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
import { ExternalLink, PackageCheck, PackageX, CircleHelp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import ShowroomDetails from './details';
import type { Showroom, ShowroomAvailabilityStatus } from './types';

type ShowroomResultsProps = {
    availability?: Record<string, ShowroomAvailabilityStatus>;
    distanceUnit: string;
    mapEnabled: boolean;
    productAware: boolean;
    selectedShowroomId: string | null;
    showrooms: Showroom[];
    onSelect: (showroomId: string) => void;
};

function safeAppointmentUrl(value?: string): string | null {
    if (!value) return null;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
    } catch {
        return null;
    }
}

function Availability({ status }: { status: ShowroomAvailabilityStatus }) {
    const { t } = useTranslation('showrooms');
    const Icon = status === 'available' ? PackageCheck : status === 'unavailable' ? PackageX : CircleHelp;
    return (
        <p
            className={
                status === 'available'
                    ? 'flex items-center gap-2 text-sm text-success'
                    : 'flex items-center gap-2 text-sm text-muted-foreground'
            }>
            <Icon aria-hidden="true" className="size-4" />
            {t(`availability.${status}`)}
        </p>
    );
}

export default function ShowroomResults({
    availability = {},
    distanceUnit,
    mapEnabled,
    productAware,
    selectedShowroomId,
    showrooms,
    onSelect,
}: ShowroomResultsProps) {
    const { t } = useTranslation('showrooms');
    return (
        <ul aria-label={t('results.label')} className="divide-y divide-border">
            {showrooms.map((showroom) => {
                const appointmentUrl = safeAppointmentUrl(showroom.c_appointmentUrl);
                const mappable =
                    mapEnabled && typeof showroom.latitude === 'number' && typeof showroom.longitude === 'number';
                const selected = mappable && showroom.id === selectedShowroomId;
                return (
                    <li key={showroom.id} className="py-6 first:pt-0 last:pb-0">
                        <article
                            className={
                                selected
                                    ? 'bg-muted/60 outline outline-2 outline-primary p-4'
                                    : 'p-4 transition-colors hover:bg-muted/40'
                            }>
                            <ShowroomDetails
                                showroom={showroom}
                                distanceUnit={distanceUnit}
                                action={
                                    mappable ? (
                                        <Button
                                            type="button"
                                            variant={selected ? 'default' : 'outline'}
                                            size="sm"
                                            className="hidden lg:inline-flex"
                                            aria-pressed={selected}
                                            onClick={() => onSelect(showroom.id)}>
                                            {selected ? t('results.shownOnMap') : t('results.showOnMap')}
                                        </Button>
                                    ) : null
                                }
                            />
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                                {productAware && (
                                    <Availability
                                        status={
                                            showroom.inventoryId
                                                ? (availability[showroom.inventoryId] ?? 'unknown')
                                                : 'unknown'
                                        }
                                    />
                                )}
                                {appointmentUrl && (
                                    <Button asChild variant="outline" size="sm">
                                        <a href={appointmentUrl} target="_blank" rel="noopener noreferrer">
                                            {t('appointment')}
                                            <ExternalLink aria-hidden="true" className="size-4" />
                                        </a>
                                    </Button>
                                )}
                            </div>
                        </article>
                    </li>
                );
            })}
        </ul>
    );
}
