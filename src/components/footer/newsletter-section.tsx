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
import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import Signup from '@/components/footer/signup';

export default function NewsletterSection(): ReactElement {
    const { t } = useTranslation('footer');

    return (
        <section className="bg-newsletter-background py-12 text-newsletter-foreground md:py-16">
            <div className="section-container text-center">
                <div className="mx-auto w-full max-w-2xl">
                    <h2 className="mb-3 text-2xl font-semibold leading-[120%] tracking-[-0.6px] text-newsletter-foreground">
                        {t('newsletter.title')}
                    </h2>
                    <p className="mb-6 text-sm font-normal leading-5 text-newsletter-foreground">
                        {t('newsletter.description')}
                    </p>
                    <div className="flex justify-center">
                        <Signup />
                    </div>
                </div>
            </div>
        </section>
    );
}
