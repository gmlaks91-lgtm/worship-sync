import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type AnalyzeSheetRequestBody = {
  imageUrl: string | string[];
};

type SheetMarkerResponse = {
  text: string;
  x: number;
  y: number;
};

const PROMPT = `You are an expert musical sheet analyzer. Look at the provided sheet music image. Find all the musical chords (e.g., C, F#m, G7) written above the lyrics or staves. Return the result STRICTLY as a JSON array of objects. Each object must have: 'text' (the chord string), 'x' (the approximate X coordinate percentage from left, 0-100), and 'y' (the approximate Y coordinate percentage from top, 0-100). Do not wrap the JSON in markdown blocks.`;

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const extractJsonArray = (text: string) => {
  const sanitized = text.replace(/```(?:json)?/gi, "").trim();
  const match = sanitized.match(/\[[\s\S]*\]/);
  return match ? match[0] : sanitized;
};

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const isRetryableModelError = (error: unknown) => {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return [
    "503",
    "service unavailable",
    "high demand",
    "temporary",
    "temporarily",
    "try again later",
  ].some((keyword) => message.includes(keyword));
};

async function generateContentWithRetry(model: any, request: unknown, maxRetries = 2) {
  let attempt = 0;
  while (true) {
    try {
      return await model.generateContent(request as any);
    } catch (error) {
      if (attempt >= maxRetries || !isRetryableModelError(error)) {
        throw error;
      }
      const backoff = 500 * (attempt + 1);
      console.warn(`Gemini request retry ${attempt + 1} after ${backoff}ms`, error instanceof Error ? error.message : error);
      await sleep(backoff);
      attempt += 1;
    }
  }
}

const parseMarkers = (value: unknown): SheetMarkerResponse[] => {
  if (!Array.isArray(value)) {
    throw new Error("AI 응답이 JSON 배열 형식이 아닙니다.");
  }

  return value.map((item, index) => {
    if (typeof item !== "object" || item === null) {
      throw new Error(`AI 응답 항목 ${index} 형식이 올바르지 않습니다.`);
    }

    const maybeItem = item as Record<string, unknown>;
    const text = typeof maybeItem.text === "string" ? maybeItem.text.trim() : undefined;
    const rawX = maybeItem.x;
    const rawY = maybeItem.y;
    const x = typeof rawX === "number" ? rawX : typeof rawX === "string" ? Number(rawX) : NaN;
    const y = typeof rawY === "number" ? rawY : typeof rawY === "string" ? Number(rawY) : NaN;

    if (!text || !Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`AI 응답 항목 ${index}의 필드가 올바르지 않습니다.`);
    }

    return {
      text,
      x: clampPercent(x),
      y: clampPercent(y),
    };
  });
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: "GOOGLE_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const body = (await request.json()) as AnalyzeSheetRequestBody;
    console.log("들어온 원본 URL:", body.imageUrl);

    const rawImageUrl = Array.isArray(body.imageUrl) ? body.imageUrl[0] : body.imageUrl;
    if (!rawImageUrl || typeof rawImageUrl !== "string" || rawImageUrl.trim() === "") {
      return NextResponse.json({ message: "imageUrl이 필요합니다." }, { status: 400 });
    }

    let imageUrl: string;
    try {
      const trimmedUrl = rawImageUrl.trim();
      if (trimmedUrl.startsWith("http://") || trimmedUrl.startsWith("https://")) {
        imageUrl = trimmedUrl;
      } else {
        const requestUrl = new URL(request.url);
        const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
        imageUrl = new URL(trimmedUrl, baseUrl).toString();
      }
    } catch (error) {
      console.error("URL parsing failed:", error, "original:", rawImageUrl);
      return NextResponse.json(
        {
          message: `imageUrl 파싱 실패: ${error instanceof Error ? error.message : "Unknown error"}`,
          original: rawImageUrl,
        },
        { status: 500 },
      );
    }

    const sheetResponse = await fetch(imageUrl);
    if (!sheetResponse.ok) {
      return NextResponse.json({ message: "악보 이미지를 불러오지 못했습니다." }, { status: 502 });
    }

    const arrayBuffer = await sheetResponse.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const mimeType = sheetResponse.headers.get("content-type") ?? "image/png";
    const base64 = imageBuffer.toString("base64");

    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await generateContentWithRetry(model, {
      contents: [
        {
          role: "user",
          parts: [
            { text: PROMPT },
            {
              inlineData: {
                mimeType,
                data: base64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 512,
      },
    });

    const candidate = result.response?.candidates?.[0];
    if (!candidate) {
      return NextResponse.json({ message: "AI 응답을 받지 못했습니다." }, { status: 500 });
    }

    const textOutput = candidate.content?.parts
      .map((part) => ("text" in part && typeof part.text === "string" ? part.text : ""))
      .join("")
      .trim();

    if (!textOutput) {
      return NextResponse.json({ message: "AI 응답 텍스트를 파싱할 수 없습니다." }, { status: 500 });
    }

    const jsonText = extractJsonArray(textOutput).trim();
    if (!jsonText.startsWith("[")) {
      console.error("AI returned non-JSON response", { textOutput, jsonText });
      return NextResponse.json(
        {
          message: "AI가 유효한 JSON 배열을 반환하지 않았습니다.",
          details: textOutput,
        },
        { status: 500 },
      );
    }

    let parsedMarkers: unknown;
    try {
      parsedMarkers = JSON.parse(jsonText);
    } catch (error) {
      console.error("JSON.parse failed for AI response", { textOutput, jsonText, error });
      return NextResponse.json(
        {
          message: "AI 응답 JSON을 파싱하지 못했습니다.",
          details: textOutput,
        },
        { status: 500 },
      );
    }

    const markers = parseMarkers(parsedMarkers);
    return NextResponse.json(markers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 분석 중 알 수 없는 오류가 발생했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
