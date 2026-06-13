/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useCallback, useState } from 'react';
import { parseFile } from '../../lib/fileParser';
import { ReferenceMaterial } from '../../types';

interface FileDropzoneProps {
  onFilesParsed: (materials: ReferenceMaterial[]) => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ onFilesParsed }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
    else if (e.type === 'dragleave') setIsDragging(false);
  }, []);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const parsedMaterials: ReferenceMaterial[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const parsed = await parseFile(files[i]);
        parsedMaterials.push(parsed);
      } catch (err: any) {
        setError(err.message);
      }
    }
    
    if (parsedMaterials.length > 0) {
      onFilesParsed(parsedMaterials);
    }
  }, [onFilesParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="w-full">
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed p-8 text-center transition-colors duration-200 ease-in-out cursor-pointer flex flex-col items-center justify-center
          ${isDragging ? 'border-red-600 bg-red-900/10 text-red-500' : 'border-gray-800 bg-black text-gray-500 hover:border-gray-600'}`}
      >
        <input 
          type="file" 
          multiple 
          accept="image/*, .txt, .md, .json" 
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <p className="font-mono text-sm uppercase tracking-widest pointer-events-none">
          {isDragging ? 'Drop to Ingest' : 'Click or Drag Reference Material (Images/Text)'}
        </p>
      </div>
      {error && <p className="mt-2 text-xs text-red-500 font-mono">ERROR: {error}</p>}
    </div>
  );
};
