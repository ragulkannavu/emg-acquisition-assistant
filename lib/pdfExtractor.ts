'use client';

import { Movement } from '@/lib/types';
import { nanoid } from '@/lib/utils';

/**
 * Extracts real text content from a PDF file using pdfjs-dist.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');

  // Use CDN worker — no bundling needed
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const textParts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    textParts.push(`[Page ${pageNum}]\n${pageText}`);
  }

  return textParts.join('\n\n');
}

/**
 * Sends the real extracted PDF text to the server-side AI route.
 * The route calls Claude to parse the actual protocol structure.
 */
export async function extractProtocolFromText(
  text: string,
  filename: string
): Promise<{
  name: string;
  description: string;
  movements: Movement[];
}> {
  const res = await fetch('/api/extract-protocol', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, filename }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error ?? 'Extraction failed');
  }

  // Attach client-generated IDs to each movement
  const movements: Movement[] = (data.movements ?? []).map(
    (m: Omit<Movement, 'id'>) => ({ ...m, id: nanoid() })
  );

  return {
    name: data.name,
    description: data.description,
    movements,
  };
}
