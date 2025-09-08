import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export const loadPDFDocument = async (source: string | ArrayBuffer): Promise<any> => {
  try {
    const loadingTask = pdfjsLib.getDocument(source);
    return await loadingTask.promise;
  } catch (error) {
    throw new Error(`Failed to load PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const renderPDFPage = async (
  page: any,
  canvas: HTMLCanvasElement,
  scale: number,
  rotation: number = 0
): Promise<void> => {
  const viewport = page.getViewport({ scale, rotation });
  const context = canvas.getContext('2d')!;
  
  canvas.height = viewport.height;
  canvas.width = viewport.width;
  
  const renderContext = {
    canvasContext: context,
    viewport: viewport
  };
  
  await page.render(renderContext).promise;
};

export const searchInPage = (textContent: any, query: string, matchCase: boolean = false, wholeWords: boolean = false): SearchMatch[] => {
  if (!query.trim()) return [];
  
  const textItems = textContent.items;
  const matches: SearchMatch[] = [];
  
  // Search within each text item individually
  textItems.forEach((item: any, itemIndex: number) => {
    const text = item.str || '';
    if (!text) return;
    
    if (wholeWords) {
      // Use regex for whole word matching
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const flags = matchCase ? 'g' : 'gi';
      const regex = new RegExp(`\\b${escapedQuery}\\b`, flags);
      
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          itemIndex,
          matchIndex: match.index,
          text: match[0],
          fullText: text
        });
        
        // Prevent infinite loop on zero-length matches
        if (match.index === regex.lastIndex) {
          regex.lastIndex++;
        }
      }
    } else {
      // Regular substring search
      const normalizedQuery = matchCase ? query : query.toLowerCase();
      const normalizedText = matchCase ? text : text.toLowerCase();
      let searchIndex = 0;
      
      while (true) {
        const matchIndex = normalizedText.indexOf(normalizedQuery, searchIndex);
        if (matchIndex === -1) break;
        
        matches.push({
          itemIndex,
          matchIndex,
          text: text.substring(matchIndex, matchIndex + query.length),
          fullText: text
        });
        
        searchIndex = matchIndex + query.length;
      }
    }
  });
  
  return matches;
};

export interface SearchMatch {
  itemIndex: number;
  matchIndex: number;
  text: string;
  fullText: string;
}

export const highlightTextInElement = (element: HTMLElement, matches: any[], selectedMatchIndex: number = -1): void => {
  if (matches.length === 0) {
    clearHighlightsInElement(element);
    return;
  }
  
  const originalText = element.textContent || '';
  let html = originalText;
  
  // Get computed styles for accurate measurement
  const computedStyle = window.getComputedStyle(element);
  const fontSize = parseFloat(computedStyle.fontSize) || 16;
  const fontFamily = computedStyle.fontFamily || 'sans-serif';
  
  // Create a temporary canvas for text measurement
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.font = `${fontSize}px ${fontFamily}`;
  }
  
  // Sort matches by start position in descending order to avoid index shifting
  const sortedMatches = [...matches].sort((a, b) => b.matchIndex - a.matchIndex);
  
  sortedMatches.forEach((match, index) => {
    const matchStart = match.matchIndex;
    const matchEnd = match.matchIndex + match.text.length;
    const matchText = originalText.substring(matchStart, matchEnd);
    const isSelected = matches.indexOf(match) === selectedMatchIndex;
    const classes = `highlight${isSelected ? ' selected' : ''} appended`;
    
    // Calculate accurate width using canvas text measurement
    let widthStyle = 'display: inline-block;';
    if (ctx) {
      const textWidth = ctx.measureText(matchText).width;
      widthStyle += ` width: ${textWidth}px;`;
    } else {
      // Fallback to character-based calculation
      const charCount = matchText.length;
      const approximateCharWidth = fontSize * 0.6; // More accurate fallback
      widthStyle += ` width: ${charCount * approximateCharWidth}px;`;
    }
    
    const highlightSpan = `<span class="${classes}" role="presentation" style="${widthStyle}">${escapeHtml(matchText)}</span>`;
    
    // Replace the match text with the highlighted span
    html = html.substring(0, matchStart) + highlightSpan + html.substring(matchEnd);
  });
  
  element.innerHTML = html;
};

const escapeHtml = (text: string): string => {
  const div = window.document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const searchInPagePDFJS = (textContent: any, query: string): any[] => {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase();
  const textItems = textContent.items;
  const matches: any[] = [];
  
  textItems.forEach((item: any, textDivIndex: number) => {
    const text = item.str || '';
    const normalizedText = text.toLowerCase();
    let searchIndex = 0;
    
    while (true) {
      const matchIndex = normalizedText.indexOf(normalizedQuery, searchIndex);
      if (matchIndex === -1) break;
      
      const matchEnd = matchIndex + normalizedQuery.length;
      
      matches.push({
        textDivIndex,
        start: matchIndex,
        end: matchEnd,
        text: text.substring(matchIndex, matchEnd)
      });
      
      searchIndex = matchIndex + 1;
    }
  });
  
  return matches;
};

export const clearHighlightsInElement = (element: HTMLElement): void => {
  // Get the original text content without HTML
  const textContent = element.textContent || '';
  element.innerHTML = '';
  element.textContent = textContent;
};

export const searchInPageAdvanced = (textContent: any, query: string): SearchMatch[] => {
  if (!query.trim()) return [];
  
  const normalizedQuery = query.toLowerCase();
  const textItems = textContent.items;
  const matches: SearchMatch[] = [];
  
  // Build a character-to-item mapping for cross-item matches
  let fullText = '';
  const charToItemMap: Array<{ itemIndex: number; charIndex: number }> = [];
  
  textItems.forEach((item: any, itemIndex: number) => {
    const text = item.str || '';
    for (let i = 0; i < text.length; i++) {
      charToItemMap.push({ itemIndex, charIndex: i });
    }
    fullText += text;
  });
  
  const normalizedText = fullText.toLowerCase();
  let searchIndex = 0;
  
  while (true) {
    const matchIndex = normalizedText.indexOf(normalizedQuery, searchIndex);
    if (matchIndex === -1) break;
    
    const matchEnd = matchIndex + normalizedQuery.length;
    
    // Find which text items this match spans using character mapping
    const startMapping = charToItemMap[matchIndex];
    const endMapping = charToItemMap[matchEnd - 1];
    
    if (startMapping && endMapping) {
      // Collect all items that contain part of this match
      const involvedItems = new Set<number>();
      for (let i = matchIndex; i < matchEnd && i < charToItemMap.length; i++) {
        involvedItems.add(charToItemMap[i].itemIndex);
      }
      
      matches.push({
        text: fullText.substring(matchIndex, matchEnd),
        matchIndex,
        matchEnd,
        startItemIndex: startMapping.itemIndex,
        endItemIndex: endMapping.itemIndex,
        involvedItems: Array.from(involvedItems),
        startCharIndex: startMapping.charIndex,
        endCharIndex: endMapping.charIndex
      });
    }
    
    searchIndex = matchIndex + 1;
  }
  
  return matches;
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  // Create download link exactly like PDF.js viewer
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  
  // Hide the link
  link.style.display = 'none';
  document.body.appendChild(link);
  
  // Trigger download
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  
  // Revoke URL after a short delay to ensure download starts
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
};

export const printPDF = async (pdfDocument: any, filename: string = 'document'): Promise<void> => {
  try {
    // Create print container exactly like PDF.js viewer does
    const printContainer = document.createElement('div');
    printContainer.id = 'printContainer';
    printContainer.style.display = 'none';
    printContainer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(printContainer);
    
    // Add print-specific CSS
    const printStyles = document.createElement('style');
    printStyles.id = 'printStyles';
    printStyles.type = 'text/css';
    printStyles.textContent = `
      @media print {
        body > *:not(#printContainer) { display: none !important; }
        #printContainer { display: block !important; position: static !important; }
        .printedPage { 
          page-break-after: always; 
          page-break-inside: avoid;
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        .printedPage:last-child { page-break-after: auto; }
        .printedPage canvas {
          max-width: 100%;
          max-height: 100%;
          width: auto !important;
          height: auto !important;
          display: block;
        }
      }
    `;
    document.head.appendChild(printStyles);
    
    // Render each page for printing
    const printScale = 2; // Higher resolution for printing
    
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const viewport = page.getViewport({ scale: printScale });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) continue;
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.setAttribute('aria-label', `Page ${i} of ${pdfDocument.numPages}`);
      
      // Render the page
      await page.render({
        canvasContext: context,
        viewport: viewport,
        intent: 'print'
      }).promise;
      
      // Create page container
      const pageDiv = document.createElement('div');
      pageDiv.className = 'printedPage';
      pageDiv.setAttribute('data-page-number', i.toString());
      pageDiv.appendChild(canvas);
      printContainer.appendChild(pageDiv);
    }
    
    // Show print container and trigger print
    printContainer.style.display = 'block';
    
    // Small delay to ensure rendering is complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Trigger print dialog
    const printResult = window.print();
    
    // Clean up after print dialog closes
    const cleanup = (force = false) => {
      if (printContainer.parentNode) {
        try {
          printContainer.parentNode.removeChild(printContainer);
        } catch (e) {
          console.warn('Error removing print container:', e);
        }
      }
      if (printStyles.parentNode) {
        try {
          printStyles.parentNode.removeChild(printStyles);
        } catch (e) {
          console.warn('Error removing print styles:', e);
        }
      }
      
      // Remove event listeners
      window.removeEventListener('afterprint', afterPrint);
      window.removeEventListener('beforeunload', cleanup);
    };
    
    // Listen for after print event
    const afterPrint = () => {
      cleanup();
    };
    
    window.addEventListener('afterprint', afterPrint);
    
    // Also cleanup if user navigates away
    window.addEventListener('beforeunload', cleanup);
    
    // Fallback cleanup after 5 seconds
    setTimeout(() => {
      cleanup(true);
    }, 5000);
    
  } catch (error) {
    console.error('Print failed:', error);
    
    // Emergency cleanup in case of error
    const existingContainer = document.getElementById('printContainer');
    const existingStyles = document.getElementById('printStyles');
    
    if (existingContainer?.parentNode) {
      existingContainer.parentNode.removeChild(existingContainer);
    }
    if (existingStyles?.parentNode) {
      existingStyles.parentNode.removeChild(existingStyles);
    }
    
    throw new Error(`Print failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

export const validatePDFFile = (file: File): boolean => {
  const validTypes = ['application/pdf'];
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  return validTypes.includes(file.type) && file.size <= maxSize;
};