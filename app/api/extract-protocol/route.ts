import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const EXTRACTION_PROMPT = `You are a biomedical signal processing researcher specializing in EMG protocol design.

Your task is to STRICTLY extract structured protocol information from the document text below.

CRITICAL RULES (must be followed exactly):
- Use movement names EXACTLY as written in the document (case and wording preserved).
- Do NOT paraphrase, simplify, or rename movements.
- Do NOT merge or split movements unless explicitly stated.
- Prefer TABLE information over paragraph text when both exist.
- Distinguish clearly between:
  (a) trial-level events
  (b) session-level events
  (c) calibration or baseline recordings
- Do NOT invent missing steps.
- Only infer timing defaults when the protocol explicitly defines a fixed trial structure.

OUTPUT FORMAT:
Return ONLY a valid JSON object with the following exact structure:

{
  "name": "string - protocol title from document",
  "description": "string - concise summary based strictly on document",
  "movements": [
    {
      "name": "string - exact movement or rest label from document",
      "muscle_group": "string - target muscle(s) ONLY if explicitly mentioned, otherwise empty string",
      "type": "contraction | rest | transition",
      "duration_ms": integer,
      "repetitions": integer,
      "instructions": "string - verbatim or lightly condensed instruction text if present, otherwise empty string"
    }
  ]
}

INTERPRETATION RULES:

1. Movement Names
- Use action names from tables exactly (e.g. 'Fingers flexed together in fist').
- Use rest labels exactly as written (e.g. 'Rest (Trial Start)', 'Rest (Inter-block)').
- MVC must be labeled exactly as 'Maximum Voluntary Contraction (MVC)'.

2. Timing
- Convert seconds to milliseconds.
- If a fixed trial structure is defined (e.g. Rest 2 s → Action 4 s → Rest 2 s),
  apply it consistently to all listed actions.
- Do NOT infer alternative durations.

3. Repetitions
- Use explicitly stated repetition counts.
- If repetitions are defined globally (e.g. 10 repetitions per action),
  apply that value to each relevant action.
- Use repetitions = 1 for single rest or calibration steps unless otherwise stated.

4. Muscle Group
- Populate only if the protocol explicitly names muscles (e.g. Flexor Carpi Radialis).
- If the document only states forearm or general region, leave empty string.

5. Instructions
- Include force limits, posture constraints, relaxation instructions when stated.
- Do NOT add instructional text that is not present.

6. Ordering
- Output movements in the logical execution order implied by the protocol:
  calibration → baseline → trials → inter-block rest → MVC (if applicable).

7. JSON STRICTNESS
- Output ONLY raw JSON.
- No markdown.
- No explanations.
- No comments.
- No trailing commas.

DOCUMENT TEXT:`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GOOGLE_API_KEY is not configured. Add it to your .env.local file.' },
      { status: 500 }
    );
  }

  let body: { text: string; filename: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { text, filename } = body;
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'Missing text field' }, { status: 400 });
  }

  const truncatedText = text.slice(0, 12000);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(`${EXTRACTION_PROMPT}\n\n${truncatedText}`);
    const responseText = result.response.text();

    // Strip markdown code fences if present
    const jsonText = responseText
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    let parsed: {
      name: string;
      description: string;
      movements: {
        name: string;
        muscle_group: string;
        type: string;
        duration_ms: number;
        repetitions: number;
        instructions: string;
      }[];
    };

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return NextResponse.json(
        { error: 'AI returned invalid JSON. Raw response: ' + responseText.slice(0, 200) },
        { status: 500 }
      );
    }

    const movements = (parsed.movements ?? []).map((m) => ({
      name: String(m.name ?? ''),
      muscle_group: String(m.muscle_group ?? ''),
      type: ['contraction', 'rest', 'transition'].includes(m.type) ? m.type : 'contraction',
      duration_ms: Math.max(500, Number(m.duration_ms) || 5000),
      repetitions: Math.max(1, Number(m.repetitions) || 1),
      instructions: String(m.instructions ?? ''),
    }));

    const protocolName =
      parsed.name ||
      filename
        .replace(/\.pdf$/i, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    return NextResponse.json({
      name: protocolName,
      description: parsed.description || 'Protocol imported from PDF.',
      movements,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `AI extraction failed: ${message}` }, { status: 500 });
  }
}
