import axios from "axios";
import { responseSchema } from "./schema.js";

// 配置ID常量
const CONFIG_ID = "gemini-translate/config";

// 获取配置
function getConfig() {
  const config = utools.db.get(CONFIG_ID);
  return (
    config || {
      _id: CONFIG_ID,
      apiKey: "",
      proxy: "",
      model: "gemini-2.0-flash",
    }
  );
}

// 保存配置
function saveConfig(config) {
  const result = utools.db.put(config);
  if (result.ok) {
    config._rev = result.rev;
    return true;
  }
  console.error("保存配置失败:", result.message);
  return false;
}

/**
 * 调用Gemini API生成内容
 * @param {string} text - 输入文本
 * @returns {Promise<string>} 生成的内容
 */
async function geminiGenerate(text) {
  const userConfig = getConfig();

  if (!userConfig.apiKey) {
    throw new Error("请先配置API密钥");
  }

  const body = {
    contents: [
      {
        parts: [{ text }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${userConfig.model}:generateContent?key=${userConfig.apiKey}`;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    proxy: userConfig.proxy || false,
  };

  try {
    const response = await axios(url, options);
    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API调用出错:", error);
    const errorMessage =
      error.response?.data?.error?.message || error.message || "未知错误";
    throw new Error(`API请求失败: ${errorMessage}`);
  }
}

/**
 * 文本翻译函数
 * @param {string} text - 需要翻译的文本
 * @returns {Promise<string>} 翻译结果
 */
export async function translate(text) {
  const prompt = `
<example>
  <text>
  He parked behind his house.
  </text>
  <output>
  {
    "text": "He parked behind his house.",
    "translation": "他把车子停放在房子后面。",
    "vocabulary": [
      {
        "text": "park",
        "pronunciation": "pɑːk",
        "definitions": [
          {
            "definition": "停车",
            "type": "vi.",
            "examples": ["He parked behind his house."]
          },
          {
            "definition": "公园",
            "type": "n.",
            "examples": ["He parked in the park."]
          },
          {
            "definition": "停车场",
            "type": "n.",
            "examples": ["He parked his car in the parking lot."]
          }
        ]
      }
    ]
  }
  </output>
</example>
<text>${text}</text>
<instruction>
  翻译文本，并且满足以下要求：
  <requirement>
  1. 如果文本是除中文外的其他语言，翻译为中文，否则翻译为英文。
  2. 根据不同语境，在vocabulary中给出关键多义词或短语的不同含义或解释，帮助理解。
  3. 如果文本是日语，则单词部分使用假名表音。
  4. 如果文本是中文，则单词部分使用拼音表音。
  5. 如果文本只包含一个词语或者单词则只列出该词汇的含义，而不输出translation。
  6. 输出简洁明了。
  7. 只展示翻译结果和必要的多义解释，不添加额外内容。
  </requirement>
</instruction>
`;
  return await geminiGenerate(prompt);
}

/**
 * 更新配置
 * @param {string} apiKey - API密钥
 * @param {string} proxy - 代理地址
 * @param {string} model - 模型名称
 * @returns {boolean} 是否更新成功
 */
export function updateConfig(apiKey, proxy, model) {
  const config = getConfig();
  config.apiKey = apiKey;
  config.proxy = proxy;
  config.model = model;
  return saveConfig(config);
}

/**
 * 获取当前配置
 * @returns {Object} 当前配置
 */
export function getCurrentConfig() {
  return getConfig();
}
