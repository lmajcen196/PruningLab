export type ModelInfo = {
   id: string;
   name: string;
   description: string;
};

const models: ModelInfo[] = [
   {
      id: "mistral-7b-instruct",
      name: "Mistral-7B-Instruct-v0.2",
      description: "Open-weight instruction model. Recommended for ABP and MBP experiments.",
   },
   {
      id: "llama-3-8b-instruct",
      name: "Llama-3-8B-Instruct",
      description: "Meta instruction model. Requires Hugging Face access approval.",
   },
   {
      id: "gemma-2-9b-instruct",
      name: "Gemma-2-9B-Instruct",
      description: "Google Gemma 2 instruction model. Requires Hugging Face access approval.",
   },
];

export default models;
