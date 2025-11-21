import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LiquidAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    liquidName: {
      type: Type.STRING,
      description: "Tên dự đoán của chất lỏng (Ví dụ: Nước cam, Axit Sulfuric, Nước tẩy).",
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
      description: "Giải thích ngắn gọn tại sao đưa ra độ pH này dựa trên màu sắc, bọt, ngữ cảnh hình ảnh.",
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
      description: "Các ứng dụng phổ biến của chất lỏng này.",
    },
    isLiquidDetected: {
      type: Type.BOOLEAN,
      description: "True nếu phát hiện chất lỏng trong hình, False nếu không.",
    }
  },
  required: ["liquidName", "estimatedPH", "reasoning", "isLiquidDetected", "properties", "safetyWarning", "commonUses"],
};

export const analyzeLiquidImage = async (base64Image: string, mimeType: string = "image/jpeg"): Promise<LiquidAnalysis> => {
  try {
    const prompt = `Bạn là một chuyên gia hóa học AI. Hãy phân tích hình ảnh này để xác định chất lỏng bên trong.
    Dựa trên màu sắc, độ nhớt (nếu nhìn thấy), bọt khí, vật chứa (cốc thí nghiệm, chai nước ngọt, v.v.) và bối cảnh, hãy ước tính độ pH của nó.
    Nếu hình ảnh không chứa chất lỏng rõ ràng, hãy đặt 'isLiquidDetected' là false.
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
        systemInstruction: "Bạn là một trợ lý phòng thí nghiệm ảo chính xác và hữu ích.",
        temperature: 0.4, // Lower temperature for more analytical results
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