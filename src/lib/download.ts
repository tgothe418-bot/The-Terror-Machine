/**
 * Triggers a browser download of a JSON object as a file.
 * @param data The object to download.
 * @param filename The name of the file (e.g., 'scenario_blueprint.json').
 */
export function downloadJson(data: any, filename: string) {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    // Small delay before cleanup to ensure trigger in some browsers
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Download failed:', error);
  }
}
