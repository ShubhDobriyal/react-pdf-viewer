import React, { useRef, useEffect, useState, useCallback } from 'react';
import { searchInPage, highlightTextInElement, clearHighlightsInElement, SearchMatch } from './utils';
import * as pdfjsLib from 'pdfjs-dist';

interface PageCanvasProps {
  document: any;
  pageNumber: number;
  scale: number;
  searchQuery: string;
  searchMatchCase: boolean;
  searchWholeWords: boolean;
  currentSearchResult: number;
  searchTimestamp?: number;
  onSearchMatches: (pageNumber: number, matches: any[]) => void;
  getCurrentMatchIndex: (pageNumber: number, matchIndex: number) => number;
  onTextLayerReady?: () => void;
}

const PageCanvas: React.FC<PageCanvasProps> = ({
  document,
  pageNumber,
  scale,
  searchQuery,
  searchMatchCase,
  searchWholeWords,
  currentSearchResult,
  searchTimestamp,
  onSearchMatches,
  getCurrentMatchIndex,
  onTextLayerReady
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<any>(null);
  const [renderKey, setRenderKey] = useState(0);
  const textDivsRef = useRef<(HTMLElement | null)[]>([]);
  const textLayerRenderTask = useRef<any>(null);
  
  // Track current render operation
  const currentRenderRef = useRef<{
    task: any;
    canvas: HTMLCanvasElement;
    page: any;
  } | null>(null);

  const cleanup = useCallback(() => {
    if (currentRenderRef.current) {
      // Cancel render task
      if (currentRenderRef.current.task) {
        try {
          currentRenderRef.current.task.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      }
      
      // Remove canvas from DOM
      if (currentRenderRef.current.canvas && currentRenderRef.current.canvas.parentNode) {
        currentRenderRef.current.canvas.parentNode.removeChild(currentRenderRef.current.canvas);
      }
      
      currentRenderRef.current = null;
    }
    
    // Clear text divs reference
    textDivsRef.current = [];
  }, []);

  const renderPage = useCallback(async () => {
    if (!document || !containerRef.current) return;

    // Cleanup previous render
    cleanup();
    
    setIsLoading(true);
    setError(null);

    try {
      // Get the page
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      
      // Create a new canvas for this render operation
      const canvas = window.document.createElement('canvas');
      const context = canvas.getContext('2d', { alpha: false });
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      // Set canvas dimensions
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.className = 'page-canvas';
      
      // Set container dimensions to match canvas
      if (containerRef.current) {
        containerRef.current.style.width = `${viewport.width}px`;
        containerRef.current.style.height = `${viewport.height}px`;
      }
      
      // Clear the container and add the new canvas
      if (containerRef.current) {
        // Remove any existing canvas
        const existingCanvas = containerRef.current.querySelector('canvas');
        if (existingCanvas) {
          existingCanvas.remove();
        }
        containerRef.current.appendChild(canvas);
      }

      // Create render context
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        enableWebGL: false,
        renderInteractiveForms: false
      };
      
      // Start render task
      const renderTask = page.render(renderContext);
      
      // Store current render operation
      currentRenderRef.current = {
        task: renderTask,
        canvas: canvas,
        page: page
      };
      
      // Wait for render to complete
      await renderTask.promise;
      
      // Check if this render is still current (not cancelled)
      if (currentRenderRef.current?.task === renderTask) {
        // Render text layer using PDF.js TextLayer
        const textContent = await page.getTextContent();
        setTextContent(textContent);
        
        // Render text layer manually (PDF.js style)
        if (textLayerRef.current && textContent) {
          // Clear previous text layer
          textLayerRef.current.innerHTML = '';
          
          // Set up text layer container
          const textLayerDiv = textLayerRef.current;
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.height = `${viewport.height}px`;
          textLayerDiv.style.position = 'absolute';
          textLayerDiv.style.top = '0';
          textLayerDiv.style.left = '0';
          textLayerDiv.style.overflow = 'hidden';
          textLayerDiv.style.lineHeight = '1';
          textLayerDiv.style.pointerEvents = 'auto';
          
          // Render text items manually
          textContent.items.forEach((textItem: any, index: number) => {
            const textDiv = window.document.createElement('div');
            
            // Get text item transform and apply viewport transform
            const tx = pdfjsLib.Util.transform(viewport.transform, textItem.transform);
            
            // Calculate position, scale, and rotation
            const angle = Math.atan2(tx[1], tx[0]);
            const scaleX = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
            const scaleY = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
            
            // Calculate font size based on transform matrix
            const fontSize = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
            
            // Calculate width based on text content and font metrics
            let width = 0;
            if (textItem.width) {
              width = textItem.width * scaleX;
            } else if (textItem.str) {
              // Estimate width based on character count and font size
              width = textItem.str.length * fontSize * 0.6; // Rough estimation
            }
            
            // Calculate height
            const height = textItem.height ? textItem.height * scaleY : fontSize;
            
            const style = textDiv.style;
            
            // Position and dimensions
            style.position = 'absolute';
            style.left = `${tx[4]}px`;
            style.top = `${tx[5] - fontSize}px`; // Adjust for baseline
            style.width = `${width}px`;
            style.height = `${height}px`;
            
            // Font properties
            style.fontSize = `${fontSize}px`;
            style.fontFamily = textItem.fontName || 'sans-serif';
            
            // Apply transforms for rotation and scaling
            const transforms = [];
            if (angle !== 0) {
              transforms.push(`rotate(${angle}rad)`);
            }
            if (scaleX !== scaleY) {
              transforms.push(`scaleX(${scaleX / scaleY})`);
            }
            if (transforms.length > 0) {
              style.transform = transforms.join(' ');
            }
            style.transformOrigin = '0% 0%';
            
            // Text styling
            style.color = 'transparent';
            style.whiteSpace = 'pre';
            style.cursor = 'text';
            style.userSelect = 'text';
            style.pointerEvents = 'auto';
            
            // Handle text direction if available
            if (textItem.dir) {
              style.direction = textItem.dir;
            }
            
            textDiv.textContent = textItem.str;
            textDiv.setAttribute('data-text-index', index.toString());
            
            // Store reference to text div for search highlighting
            textDivsRef.current[index] = textDiv;
            
            textLayerDiv.appendChild(textDiv);
          });
        }
        
        // Render annotation layer
        if (annotationLayerRef.current) {
          try {
            const annotations = await page.getAnnotations();
            if (annotations && annotations.length > 0) {
              annotationLayerRef.current.innerHTML = '';
              annotationLayerRef.current.style.width = `${viewport.width}px`;
              annotationLayerRef.current.style.height = `${viewport.height}px`;
              annotationLayerRef.current.style.position = 'absolute';
              annotationLayerRef.current.style.top = '0';
              annotationLayerRef.current.style.left = '0';
              
              // Render annotations manually
              annotations.forEach((annotation: any) => {
                if (annotation.subtype === 'Link' && annotation.url) {
                  const linkElement = window.document.createElement('a');
                  linkElement.href = annotation.url;
                  linkElement.target = '_blank';
                  linkElement.rel = 'noopener noreferrer nofollow';
                  
                  // Transform annotation rectangle using viewport
                  const rect = annotation.rect;
                  const [x1, y1, x2, y2] = rect;
                  
                  // Apply viewport transform to rectangle coordinates
                  const topLeft = viewport.convertToViewportPoint(x1, y2);
                  const bottomRight = viewport.convertToViewportPoint(x2, y1);
                  
                  linkElement.style.position = 'absolute';
                  linkElement.style.left = `${Math.min(topLeft[0], bottomRight[0])}px`;
                  linkElement.style.top = `${Math.min(topLeft[1], bottomRight[1])}px`;
                  linkElement.style.width = `${Math.abs(bottomRight[0] - topLeft[0])}px`;
                  linkElement.style.height = `${Math.abs(bottomRight[1] - topLeft[1])}px`;
                  linkElement.style.backgroundColor = 'transparent';
                  linkElement.style.border = 'none';
                  linkElement.style.cursor = 'pointer';
                  
                  annotationLayerRef.current!.appendChild(linkElement);
                }
              });
            }
          } catch (err) {
            console.warn('Annotation layer rendering error:', err);
          }
        }
        
        onTextLayerReady?.();
        setIsLoading(false);
      }
      
    } catch (err: any) {
      // Don't show error if it was just a cancellation
      if (err.name === 'RenderingCancelledException') {
        return;
      }
      console.error('Page render error:', err);
      setError(err instanceof Error ? err.message : 'Failed to render page');
      setIsLoading(false);
    }
  }, [document, pageNumber, scale, cleanup, onTextLayerReady]);

  // Force re-render when scale or rotation changes
  useEffect(() => {
    setRenderKey(prev => prev + 1);
  }, [scale]);

  // Render page when dependencies change
  useEffect(() => {
    renderPage();
  }, [renderPage, renderKey]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Handle search highlighting
  useEffect(() => {
    if (!textContent || !textLayerRef.current) {
      onSearchMatches(pageNumber, []);
      return;
    }

    if (!searchQuery.trim()) {
      // Clear all highlights
      const textDivs = textLayerRef.current.children;
      for (let i = 0; i < textDivs.length; i++) {
        const textDiv = textDivs[i] as HTMLElement;
        if (textDiv) {
          clearHighlightsInElement(textDiv);
        }
      }
      onSearchMatches(pageNumber, []);
      return;
    }

    const matches = searchInPage(textContent, searchQuery, searchMatchCase, searchWholeWords);
    onSearchMatches(pageNumber, matches);
    
    // Apply highlights to text divs
    const textDivs = textLayerRef.current.children;
    for (let i = 0; i < textDivs.length; i++) {
      const textDiv = textDivs[i] as HTMLElement;
      if (textDiv) {
        // Find matches for this text div
        const matchesForThisDiv = matches.filter(match => match.itemIndex === i);
        
        if (matchesForThisDiv.length > 0) {
          // Determine which match should be selected
          const selectedMatchIndex = matchesForThisDiv.findIndex(match => {
            const globalIndex = getCurrentMatchIndex(pageNumber, matches.indexOf(match));
            return globalIndex === currentSearchResult;
          });
          
          highlightTextInElement(textDiv, matchesForThisDiv, selectedMatchIndex);
        } else {
          clearHighlightsInElement(textDiv);
        }
      }
    }
  }, [textContent, searchQuery, searchMatchCase, searchWholeWords, currentSearchResult, searchTimestamp, pageNumber, onSearchMatches, getCurrentMatchIndex]);

  const clearSearchHighlights = () => {
    if (!textLayerRef.current) return;
    
    // Remove all highlight elements
    textLayerRef.current.querySelectorAll('.search-highlight').forEach(el => {
      el.remove();
    });
  };

  const highlightSearchMatch = (match: any, matchIndex: number) => {
    if (!textLayerRef.current) return;
    
    // For each involved text item, create highlight overlays
    match.involvedItems.forEach((itemIndex: number) => {
      const textDiv = textLayerRef.current?.children[itemIndex] as HTMLElement;
      if (!textDiv) return;
      
      const textItem = textContent.items[itemIndex];
      if (!textItem || !textItem.str) return;
      
      // Calculate which part of this text item should be highlighted
      let highlightStart = 0;
      let highlightEnd = textItem.str.length;
      
      // If this is the first item in the match, adjust start position
      if (itemIndex === match.startItemIndex) {
        highlightStart = match.startCharIndex;
      }
      
      // If this is the last item in the match, adjust end position
      if (itemIndex === match.endItemIndex) {
        highlightEnd = match.endCharIndex + 1;
      }
      
      // Create highlight element
      const highlight = window.document.createElement('div');
      highlight.className = 'search-highlight';
      highlight.setAttribute('data-match-index', matchIndex.toString());
      
      // Copy positioning from the text element
      const textStyle = window.getComputedStyle(textDiv);
      const highlightStyle = highlight.style;
      
      highlightStyle.position = 'absolute';
      highlightStyle.left = textStyle.left;
      highlightStyle.top = textStyle.top;
      highlightStyle.fontSize = textStyle.fontSize;
      highlightStyle.fontFamily = textStyle.fontFamily;
      highlightStyle.transform = textStyle.transform;
      highlightStyle.transformOrigin = textStyle.transformOrigin;
      
      // Calculate width based on highlighted portion
      const fullWidth = parseFloat(textStyle.width) || 0;
      const charWidth = fullWidth / textItem.str.length;
      const highlightWidth = (highlightEnd - highlightStart) * charWidth;
      const highlightLeft = parseFloat(textStyle.left) + (highlightStart * charWidth);
      
      highlightStyle.left = `${highlightLeft}px`;
      highlightStyle.width = `${highlightWidth}px`;
      highlightStyle.height = textStyle.height;
      
      // Styling
      highlightStyle.backgroundColor = 'rgba(255, 255, 0, 0.6)';
      highlightStyle.pointerEvents = 'none';
      highlightStyle.zIndex = '1';
      
      // Insert highlight behind the text
      textLayerRef.current.insertBefore(highlight, textDiv);
    });
  };

  // Add function to get search matches for this page (for external use)
  const getSearchMatches = useCallback(() => {
    if (!textContent || !searchQuery.trim()) return [];
    return searchInPage(textContent, searchQuery);
  }, [textContent, searchQuery]);

  // Expose search matches through ref or callback
  useEffect(() => {
    if (onTextLayerReady) {
      const matches = getSearchMatches();
      // You can pass matches to parent component here if needed
    }
  }, [getSearchMatches, onTextLayerReady]);

  if (error) {
    return (
      <div className="page-container">
        <div className="page-error">
          <div className="error-message">
            Error rendering page {pageNumber}: {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {isLoading && (
        <div className="page-loading">
          <div className="loading-spinner" />
          <div>Loading page {pageNumber}...</div>
        </div>
      )}
      <div 
        ref={containerRef}
        className="page-wrapper" 
        data-page-number={pageNumber}
        style={{ 
          position: 'relative',
          display: isLoading ? 'none' : 'block'
        }}
      >
        {/* Canvas will be dynamically added here */}
        <div
          ref={textLayerRef}
          className="text-layer"
        />
        <div
          ref={annotationLayerRef}
          className="annotation-layer"
        />
      </div>
    </div>
  );
};

export default PageCanvas;