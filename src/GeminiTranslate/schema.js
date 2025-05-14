export const responseSchema = {
  type: "object",
  properties: {
    text: {
      type: "string",
    },
    translation: {
      type: "string",
    },
    vocabulary: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: {
            type: "string",
          },
          pronunciation: {
            type: "string",
          },
          definitions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                definition: {
                  type: "string",
                },
                type: {
                  type: "string",
                },
                examples: {
                  type: "array",
                  items: {
                    type: "string",
                  },
                },
              },
              required: ["definition"],
            },
          },
        },
        required: ["text", "definitions", "pronunciation"],
      },
    },
  },
  required: ["text", "translation"],
};
