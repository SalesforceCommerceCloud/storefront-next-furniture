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

// Primary font binding for Furniture Next. Preloads the Fraunces editorial serif
// (the display/headings face) that appears above the fold in the hero and
// section titles. Body/UI text uses the system sans stack (--font-sans), so no
// body webfont is preloaded.
import fraunces from '/fonts/fraunces-variable.woff2';

/** The site's preloaded brand font, bound via `<link rel="preload">` in `root.tsx`. */
export const primaryFont = fraunces;
