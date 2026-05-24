import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDriveClient } from '@/lib/drive';
import { GoogleGenAI } from '@google/genai';
import { Readable } from 'stream';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { imageId } = body;

    if (!imageId) {
      return NextResponse.json({ error: 'Missing imageId' }, { status: 400 });
    }

    const drive = getDriveClient(session.accessToken);
    const cacheFileName = `${imageId}_magi.json`;

    // ==========================================
    // 1. CHECK GOOGLE DRIVE CACHE
    // ==========================================
    const searchRes = await drive.files.list({
      q: `name = '${cacheFileName}' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });

    const cachedFile = searchRes.data.files?.[0];

    if (cachedFile && cachedFile.id) {
      console.log(`[MAGI] Cache HIT for ${imageId}`);
      // Download the JSON from Drive
      const fileRes = await drive.files.get(
        { fileId: cachedFile.id, alt: 'media' },
        { responseType: 'json' }
      );

      return NextResponse.json({ success: true, data: fileRes.data });
    }

    // ==========================================
    // 2. CACHE MISS: FETCH IMAGE & TRANSLATE
    // ==========================================
    console.log(`[MAGI] Cache MISS for ${imageId}. Initiating Gemini Scan...`);

    // Fetch original image to send to Gemini
    const driveRes = await drive.files.get(
      { fileId: imageId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const base64Data = Buffer.from(driveRes.data as ArrayBuffer).toString('base64');
    const mimeType = driveRes.headers['content-type'] || 'image/jpeg';

    const prompt = `You are an expert manga translator and a Japanese linguistics tutor. 
Your target audience is students who already know fundamental Japanese (JLPT N4 and above).
Carefully scan the ENTIRE image and identify EVERY distinct block of text. 

You MUST return a valid JSON array of objects. Do NOT wrap the JSON in markdown blocks (like \`\`\`json). Just the raw JSON.

Each object in the array must contain exactly these 5 keys:
1. "box_2d": An array of 4 integers strictly between 0 and 1000 representing the bounding box [ymin, xmin, ymax, xmax].
2. "type": Categorize the text strictly as either "dialogue", "sfx", or "narrative".
3. "japanese": The exact original Japanese text transcribed from the image. Include kanji.
4. "translation": A natural, context-aware English translation.
5. "breakdown": A linguistic deep-dive object containing:
   - "vocabulary": An array of objects for words used in the text. SKIP basic N5 fundamentals (like 私, 行く, です). INSTRUCT on N4, N3, N2, N1 words, slang, or idioms. Each object must have: "word" (kanji if applicable), "reading" (furigana/hiragana), and "meaning" (English).
   - "grammar_note": A 1-2 sentence explanation of the grammar structure, colloquialisms, or slang used. If the sentence is extremely basic, return null.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [prompt, { inlineData: { data: base64Data, mimeType } }],
      config: { responseMimeType: 'application/json' },
    });

    const parsedData = JSON.parse(response.text || '[]');

    // ==========================================
    // 3. SAVE TO GOOGLE DRIVE
    // ==========================================
    // We need to figure out WHERE to save it.
    // The cleanest way is to save it in the EXACT SAME FOLDER as the original image.
    const originalFileMeta = await drive.files.get({
      fileId: imageId,
      fields: 'parents',
    });
    const parentFolderId = originalFileMeta.data.parents?.[0];

    const fileMetadata = {
      name: cacheFileName,
      mimeType: 'application/json',
      parents: parentFolderId ? [parentFolderId] : undefined,
    };

    const media = {
      mimeType: 'application/json',
      body: Readable.from([JSON.stringify(parsedData)]), // Convert JSON to stream for Drive API
    };

    await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    console.log(`[MAGI] Payload saved to Drive: ${cacheFileName}`);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Translation Engine Error:', error);
    // Future step: Add specific 429 / 503 error detection here for the frontend toast
    return NextResponse.json({ error: 'Failed to process translation.' }, { status: 500 });
  }
}
