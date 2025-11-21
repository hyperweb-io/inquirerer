const PLACEHOLDER_PATTERN = /{{(\w+)}}/g;

interface LicenseContext {
  year: string;
  author: string;
  email: string;
}

const LICENSE_TEMPLATES: Record<string, string> = {
  MIT: `The MIT License (MIT)

Copyright (c) {{YEAR}} {{AUTHOR}}{{EMAIL_LINE}}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`,
  "APACHE-2.0": `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright (c) {{YEAR}} {{AUTHOR}}{{EMAIL_LINE}}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
`,
  ISC: `ISC License

Copyright (c) {{YEAR}} {{AUTHOR}}{{EMAIL_LINE}}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
`,
};

export type SupportedLicense = keyof typeof LICENSE_TEMPLATES;

export function isSupportedLicense(name: string): name is SupportedLicense {
  return name.toUpperCase() in LICENSE_TEMPLATES;
}

export function renderLicense(
  licenseName: string,
  context: Partial<LicenseContext>
): string | null {
  if (!licenseName) {
    return null;
  }
  const normalized = licenseName.toUpperCase() as SupportedLicense;
  const template = LICENSE_TEMPLATES[normalized];
  if (!template) {
    return null;
  }

  const ctx: LicenseContext = {
    year: context.year ?? new Date().getFullYear().toString(),
    author: context.author ?? "Unknown Author",
    email: context.email ?? "",
  };

  const emailLine = ctx.email ? ` <${ctx.email}>` : "";

  return template.replace(PLACEHOLDER_PATTERN, (_, rawKey: string) => {
    const key = rawKey.toUpperCase();
    if (key === "EMAIL_LINE") {
      return emailLine;
    }
    const normalizedKey = key.toLowerCase() as keyof LicenseContext;
    const value = ctx[normalizedKey];
    return value || "";
  });
}

export function listSupportedLicenses(): string[] {
  return Object.keys(LICENSE_TEMPLATES);
}

