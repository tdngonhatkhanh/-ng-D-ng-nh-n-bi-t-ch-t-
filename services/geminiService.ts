import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LiquidAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    liquidName: {
      type: Type.STRING,
      description: "Tên dự đoán của chất hoặc dung dịch trong hình (Ví dụ: Nước cam, Đất ẩm, Giấy quỳ tím, Axit Sulfuric).",
    },
    estimatedPH: {
      type: Type.NUMBER,
      description: "Độ pH ước tính (từ 0 đến 14).",
    },
    confidenceLevel: {
      type: Type.STRING,
      description: "Mức độ tự tin của dự đoán (Cao, Trung bình, Thấp).",
    },
    reasoning: {
      type: Type.STRING,
      description: "Giải thích ngắn gọn tại sao đưa ra độ pH này dựa trên hình ảnh.",
    },
    properties: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Các tính chất hóa học hoặc vật lý chính.",
    },
    safetyWarning: {
      type: Type.STRING,
      description: "Cảnh báo an toàn khi tiếp xúc (nếu có).",
    },
    commonUses: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Các ứng dụng phổ biến của chất này.",
    }
  },
  required: ["liquidName", "estimatedPH", "reasoning", "properties", "safetyWarning", "commonUses"],
};

export const analyzeLiquidImage = async (base64Image: string, mimeType: string = "image/jpeg"): Promise<LiquidAnalysis> => {
  try {
    const prompt = `Bạn là một chuyên gia hóa học AI. Hãy phân tích hình ảnh này để xác định chất hoặc vật thể liên quan đến hóa học bên trong.
    Dựa trên màu sắc, bọt khí, vật chứa, giấy thử pH (nếu có) hoặc ngữ cảnh hình ảnh, hãy ước tính độ pH của nó.
    Trả lời hoàn toàn bằng Tiếng Việt.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        systemInstruction: "Bạn là một trợ lý khoa học hữu ích. Bạn luôn cố gắng đưa ra ước tính tốt nhất dựa trên hình ảnh.",
        temperature: 0.4,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Không nhận được phản hồi từ AI.");
    }

    return JSON.parse(text) as LiquidAnalysis;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Không thể phân tích hình ảnh. Vui lòng thử lại.");
  }
};