import { ReferenceMaterial } from '../types';

export const parseFile = async (file: File): Promise<ReferenceMaterial> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const id = crypto.randomUUID();

    // Handle Images -> Convert to clean Base64
    if (file.type.startsWith('image/')) {
      reader.onload = () => {
        const result = reader.result as string;
        // Gemini API requires raw Base64 without the 'data:image/jpeg;base64,' prefix
        const base64Data = result.split(',')[1]; 
        resolve({
          id,
          type: 'image',
          mimeType: file.type,
          content: base64Data,
          fileName: file.name
        });
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    } 
    // Handle Text/Markdown -> Extract raw string
    else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.json')) {
      reader.onload = () => {
        resolve({
          id,
          type: 'text',
          mimeType: file.type || 'text/plain',
          content: reader.result as string,
          fileName: file.name
        });
      };
      reader.onerror = () => reject(new Error('Failed to read text file.'));
      reader.readAsText(file);
    } 
    // Reject unsupported
    else {
      reject(new Error(`Unsupported file type: ${file.name}. Please upload images or text/markdown.`));
    }
  });
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:application/pdf;base64,")
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = error => reject(error);
    reader.readAsDataURL(file);
  });
};

export const parseBlueprintFile = async (file: File): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = JSON.parse(reader.result as string);
        resolve(result);
      } catch (err) {
        console.error("Parse JSON error", err);
        reject(new Error("Failed to parse JSON file"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
};
