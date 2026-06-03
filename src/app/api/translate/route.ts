import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  getDriveClient,
  findFileByName,
  downloadJsonFile,
  downloadImageForGemini,
  getFileParentId,
  uploadJsonFile,
} from '@/lib/drive';
import { GoogleGenAI } from '@google/genai';

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
    const cachedFileId = await findFileByName(drive, cacheFileName);

    if (cachedFileId) {
      const cachedData = await downloadJsonFile(drive, cachedFileId);

      if (cachedData) {
        console.log(`[MAGI] Cache HIT for ${imageId}`);
        return NextResponse.json({ success: true, data: cachedData });
      }
    }

    // ==========================================
    // 2. CACHE MISS: FETCH IMAGE & TRANSLATE
    // ==========================================
    console.log(`[MAGI] Cache MISS for ${imageId}. Initiating Gemini Scan...`);

    const imagePayload = await downloadImageForGemini(drive, imageId);
    if (!imagePayload) {
      throw new Error('Failed to download source image from Drive.');
    }

    const { base64Data, mimeType } = imagePayload;

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
    const parentFolderId = await getFileParentId(drive, imageId);

    // We pass undefined if parentFolderId is null, our helper handles it safely
    await uploadJsonFile(drive, cacheFileName, parsedData, parentFolderId || undefined);
    console.log(`[MAGI] Payload saved to Drive: ${cacheFileName}`);

    return NextResponse.json({ success: true, data: parsedData });
  } catch (error) {
    console.error('Translation Engine Error:', error);

    // Retained 401 Interceptor from previous context
    if (
      error.code === 401 ||
      error.status === 401 ||
      error.message?.includes('Invalid Credentials')
    ) {
      return NextResponse.json({ error: 'Google API Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Failed to process translation.' }, { status: 500 });
  }
}
