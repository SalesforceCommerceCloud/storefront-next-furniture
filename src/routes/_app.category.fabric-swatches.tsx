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
import { redirect } from 'react-router';
import type { Route } from './+types/_app.category.fabric-swatches';
import { buildUrlFromContext } from '@/lib/url.server';

/**
 * Redirect `/category/fabric-swatches` to `/swatches`.
 * The fabric-swatches category is searchable but hidden from general navigation;
 * the dedicated swatches page is the intended UI.
 */
export function loader({ context }: Route.LoaderArgs) {
    // Synchronous: just issues the redirect, so no `async` (avoids require-await).
    throw redirect(buildUrlFromContext('/swatches', context), 301);
}

export default function FabricSwatchesCategoryRedirect() {
    return null;
}
