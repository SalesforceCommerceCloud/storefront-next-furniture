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
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Typography } from '@/components/typography';
import type { Showroom } from './types';

type ShowroomDetailsProps = {
    action?: ReactNode;
    distanceUnit: string;
    showroom: Showroom;
};

export default function ShowroomDetails({ action, distanceUnit, showroom }: ShowroomDetailsProps) {
    const { t } = useTranslation('showrooms');
    const email = showroom.c_customerServiceEmail ?? showroom.email;
    const hasMoreDetails = Boolean(showroom.phone || email || showroom.storeHours);
    const locality = [showroom.city, showroom.stateCode, showroom.postalCode].filter(Boolean).join(', ');

    return (
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
                <Typography variant="large" as="h3">
                    {showroom.name ?? showroom.id}
                </Typography>
                <address className="mt-1 not-italic text-sm text-muted-foreground">
                    {showroom.address1 && <span className="block">{showroom.address1}</span>}
                    {showroom.address2 && <span className="block">{showroom.address2}</span>}
                    {locality && <span className="block">{locality}</span>}
                </address>
                {typeof showroom.distance === 'number' && (
                    <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin aria-hidden="true" className="size-4" />
                        {t('results.distance', {
                            distance: showroom.distance.toFixed(2),
                            unit: distanceUnit,
                        })}
                    </p>
                )}
            </div>
            {action && <div>{action}</div>}
            {hasMoreDetails && (
                <Accordion type="single" collapsible className="sm:col-span-2">
                    <AccordionItem value="showroom-details" className="border-none">
                        <AccordionTrigger className="py-2 text-sm">{t('results.details')}</AccordionTrigger>
                        <AccordionContent className="space-y-2 text-sm text-muted-foreground">
                            {showroom.phone && (
                                <p>
                                    <span className="font-medium text-foreground">{t('results.phone')}</span>{' '}
                                    <a href={`tel:${showroom.phone}`}>{showroom.phone}</a>
                                </p>
                            )}
                            {email && (
                                <p>
                                    <span className="font-medium text-foreground">{t('results.email')}</span>{' '}
                                    <a href={`mailto:${email}`}>{email}</a>
                                </p>
                            )}
                            {showroom.storeHours && (
                                <div>
                                    <p className="font-medium text-foreground">{t('results.hours')}</p>
                                    <p className="whitespace-pre-line">{showroom.storeHours}</p>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )}
        </div>
    );
}
