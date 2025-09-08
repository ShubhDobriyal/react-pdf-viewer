import React, { useState, useEffect, useCallback, useRef } from 'react';
import Toolbar from './Toolbar';
import Sidebar from './Sidebar';
import PageCanvas from './PageCanvas';
import { ViewerState } from './types';
import { loadPDFDocument, downloadBlob, printPDF, debounce, validatePDFFile } from './utils';
import './styles.css';

interface PDFViewerProps {
  pdfUrl: string;
  className?: string;
  onError?: (error: string) => void;
  onDocumentLoad?: (document: any) => void;
}

const PDFViewer: React.FC<PDFViewerProps> = ({
  pdfUrl,
  className = '',
  onError,
  onDocumentLoad
}) => {
  const [state, setState] = useState<ViewerState>({
    document: null,
    currentPage: 1,
    numPages: 0,
    scale: 1,
    sidebarOpen: false,
    sidebarView: 'thumbnails',
    searchQuery: '',
    searchResults: [],
    currentSearchResult: 0,
    isLoading: false,
    error: null
  });

  const viewerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const fileDataRef = useRef<ArrayBuffer | null>(null);
  const allSearchMatches = useRef<Array<{ pageNumber: number; matches: any[] }>>([]);
  const searchResultsCount = useRef(0);
  const [isPrintLoading, setIsPrintLoading] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [zoomMode, setZoomMode] = useState<'custom' | 'auto' | 'page-fit' | 'page-width'>('page-width');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMatchCase, setSearchMatchCase] = useState(false);
  const [searchWholeWords, setSearchWholeWords] = useState(false);

  // Load PDF from URL
  const loadFileFromUrl = async (url: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      await loadDocumentFromBuffer(arrayBuffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load PDF from URL';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  };

  // Load document from array buffer
  const loadDocumentFromBuffer = async (arrayBuffer: ArrayBuffer, sourceUrl?: string) => {
    try {
      const document = await loadPDFDocument(arrayBuffer);
      fileDataRef.current = arrayBuffer;
      
      setState(prev => ({
        ...prev,
        document,
        numPages: document.numPages,
        currentPage: 1,
        isLoading: false,
        error: null
      }));
      
      // Apply fit-width zoom after document loads
      setTimeout(() => {
        handleFitToWidth();
      }, 100);
      
      onDocumentLoad?.(document);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load PDF document';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      onError?.(errorMessage);
    }
  };

  // Define all callback functions before useEffect hooks
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= state.numPages) {
      setState(prev => ({ ...prev, currentPage: page }));
      
      // Scroll to the page in view
      setTimeout(() => {
        const pageElement = document.querySelector(`[data-page-number="${page}"]`);
        if (pageElement) {
          pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [state.numPages]);

  const handleScaleChange = useCallback((newScale: number) => {
    const clampedScale = Math.max(0.1, Math.min(10, newScale));
    setState(prev => ({ ...prev, scale: clampedScale }));
    setZoomMode('custom');
  }, []);

  const handleAutoZoom = useCallback(() => {
    if (pageContainerRef.current && viewerRef.current && state.document) {
      const containerWidth = viewerRef.current.clientWidth - (state.sidebarOpen ? 260 : 0) - 40;
      const containerHeight = viewerRef.current.clientHeight - 100;
      
      // Use standard A4 dimensions as fallback
      const pageWidth = 595; // A4 width in points
      const pageHeight = 842; // A4 height in points
      
      const scaleWidth = containerWidth / pageWidth;
      const scaleHeight = containerHeight / pageHeight;
      
      // Auto zoom picks the scale that fits both dimensions with some padding
      const autoScale = Math.min(scaleWidth, scaleHeight) * 0.9; // 10% padding
      const clampedScale = Math.max(0.1, Math.min(10, autoScale));
      
      setState(prev => ({ ...prev, scale: clampedScale }));
    }
  }, [state.sidebarOpen, state.document]);

  const handleFitToWidth = useCallback(() => {
    if (pageContainerRef.current && viewerRef.current) {
      const containerWidth = viewerRef.current.clientWidth - (state.sidebarOpen ? 260 : 0) - 40;
      const pageWidth = 595; // A4 width in points
      const scale = containerWidth / pageWidth;
      const clampedScale = Math.max(0.1, Math.min(10, scale));
      setState(prev => ({ ...prev, scale: clampedScale }));
    }
  }, [state.sidebarOpen]);

  const handleFitToPage = useCallback(() => {
    if (pageContainerRef.current && viewerRef.current) {
      const containerHeight = viewerRef.current.clientHeight - 100; // Account for toolbar
      const containerWidth = viewerRef.current.clientWidth - (state.sidebarOpen ? 260 : 0) - 40;
      
      const pageWidth = 595; // A4 width in points
      const pageHeight = 842; // A4 height in points
      
      const scaleWidth = containerWidth / pageWidth;
      const scaleHeight = containerHeight / pageHeight;
      const scale = Math.min(scaleWidth, scaleHeight);
      const clampedScale = Math.max(0.1, Math.min(10, scale));
      
      setState(prev => ({ ...prev, scale: clampedScale }));
    }
  }, [state.sidebarOpen]);

  const handleZoomIn = useCallback(() => {
    const currentScale = state.scale;
    let newScale;
    
    // PDF.js zoom levels: 0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 10
    const zoomLevels = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 10];
    
    // Find next higher zoom level
    const nextLevel = zoomLevels.find(level => level > currentScale);
    newScale = nextLevel || Math.min(10, currentScale * 1.1);
    
    setZoomMode('custom');
    setState(prev => ({ ...prev, scale: newScale }));
  }, [state.scale]);

  const handleZoomOut = useCallback(() => {
    const currentScale = state.scale;
    let newScale;
    
    // PDF.js zoom levels: 0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 10
    const zoomLevels = [0.1, 0.25, 0.33, 0.5, 0.67, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 10];
    
    // Find next lower zoom level
    const prevLevel = [...zoomLevels].reverse().find(level => level < currentScale);
    newScale = prevLevel || Math.max(0.1, currentScale * 0.9);
    
    setZoomMode('custom');
    setState(prev => ({ ...prev, scale: newScale }));
  }, [state.scale]);

  const handleZoomModeChange = useCallback((mode: string) => {
    if (mode === 'auto') {
      setZoomMode('auto');
      handleAutoZoom();
    } else if (mode === 'page-fit') {
      setZoomMode('page-fit');
      handleFitToPage();
    } else if (mode === 'page-width') {
      setZoomMode('page-width');
      handleFitToWidth();
    } else {
      const scaleValue = parseFloat(mode);
      if (!isNaN(scaleValue)) {
        setZoomMode('custom');
        handleScaleChange(scaleValue);
      }
    }
  }, [handleAutoZoom, handleFitToPage, handleFitToWidth, handleScaleChange]);

  const handleSidebarToggle = useCallback(() => {
    setState(prev => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  const handleSearchToggle = useCallback(() => {
    setSearchOpen(prev => {
      const newOpen = !prev;
      if (!newOpen) {
        // Clear search when closing
        setState(prevState => ({ ...prevState, searchQuery: '' }));
        allSearchMatches.current = [];
        searchResultsCount.current = 0;
      }
      return newOpen;
    });
  }, []);

  const handleSearchChange = useCallback(debounce((query: string) => {
    setState(prev => ({ ...prev, searchQuery: query }));
    if (!query.trim()) {
      allSearchMatches.current = [];
      searchResultsCount.current = 0;
      setState(prev => ({ ...prev, currentSearchResult: 0 }));
    }
  }, 100), []);

  const handleSearchMatchCaseChange = useCallback((matchCase: boolean) => {
    setSearchMatchCase(matchCase);
    // Force re-search by triggering a state change that will cause PageCanvas to re-render
    if (state.searchQuery.trim()) {
      setState(prev => ({ 
        ...prev, 
        currentSearchResult: 0,
        // Add a timestamp to force re-render of search
        searchTimestamp: Date.now()
      }));
    }
  }, [state.searchQuery]);

  const handleSearchWholeWordsChange = useCallback((wholeWords: boolean) => {
    setSearchWholeWords(wholeWords);
    // Force re-search by triggering a state change that will cause PageCanvas to re-render
    if (state.searchQuery.trim()) {
      setState(prev => ({ 
        ...prev, 
        currentSearchResult: 0,
        // Add a timestamp to force re-render of search
        searchTimestamp: Date.now()
      }));
    }
  }, [state.searchQuery]);

  const handleSearchNext = useCallback(() => {
    const totalMatches = allSearchMatches.current.reduce((total, page) => total + page.matches.length, 0);
    if (totalMatches === 0) return;
    
    const nextResult = (state.currentSearchResult + 1) % totalMatches;
    setState(prev => ({ ...prev, currentSearchResult: nextResult }));
    
    // Navigate to the page containing this result and scroll to it
    const resultPage = findPageForSearchResult(nextResult);
    if (resultPage) {
      handlePageChange(resultPage);
      // Scroll to the specific search result
      setTimeout(() => {
        scrollToSearchResult(nextResult);
      }, 100);
    }
  }, [state.currentSearchResult, handlePageChange, state.currentPage]);

  const handleSearchPrev = useCallback(() => {
    const totalMatches = allSearchMatches.current.reduce((total, page) => total + page.matches.length, 0);
    if (totalMatches === 0) return;
    
    const prevResult = state.currentSearchResult === 0 
      ? totalMatches - 1 
      : state.currentSearchResult - 1;
    setState(prev => ({ ...prev, currentSearchResult: prevResult }));
    
    // Navigate to the page containing this result and scroll to it
    const resultPage = findPageForSearchResult(prevResult);
    if (resultPage) {
      handlePageChange(resultPage);
      // Scroll to the specific search result
      setTimeout(() => {
        scrollToSearchResult(prevResult);
      }, 100);
    }
  }, [state.currentSearchResult, handlePageChange, state.currentPage]);

  const handleDownload = useCallback(() => {
    if (fileDataRef.current) {
      const blob = new Blob([fileDataRef.current], { type: 'application/pdf' });
      // Generate filename from URL
      const filename = pdfUrl 
        ? pdfUrl.split('/').pop()?.replace(/\.[^/.]+$/, '') + '.pdf' || 'document.pdf'
        : 'document.pdf';
      downloadBlob(blob, filename);
    }
  }, [pdfUrl]);

  const handlePrint = useCallback(() => {
    if (state.document && fileDataRef.current) {
      setIsPrintLoading(true);
      const filename = pdfUrl 
        ? pdfUrl.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'document'
        : 'document';
      printPDF(state.document, filename).then(() => {
        setIsPrintLoading(false);
      }).catch(error => {
        console.error('Print failed:', error);
        setIsPrintLoading(false);
        onError?.(`Print failed: ${error.message}`);
      });
    }
  }, [state.document, pdfUrl, onError]);

  const findPageForSearchResult = (resultIndex: number): number | null => {
    let currentIndex = 0;
    for (const pageMatch of allSearchMatches.current) {
      const pageMatchCount = pageMatch.matches.length;
      if (resultIndex >= currentIndex && resultIndex < currentIndex + pageMatchCount) {
        return pageMatch.pageNumber;
      }
      currentIndex += pageMatchCount;
    }
    return null;
  };

  const scrollToSearchResult = useCallback((resultIndex: number) => {
    // Find which page and match index this result corresponds to
    let currentIndex = 0;
    for (const pageMatch of allSearchMatches.current) {
      const pageMatchCount = pageMatch.matches.length;
      if (resultIndex >= currentIndex && resultIndex < currentIndex + pageMatchCount) {
        const matchIndexInPage = resultIndex - currentIndex;
        const pageNumber = pageMatch.pageNumber;
        
        // Find the selected highlight element for this match
        const pageElement = document.querySelector(`[data-page-number="${pageNumber}"]`);
        if (pageElement) {
          const textLayer = pageElement.querySelector('.text-layer');
          if (textLayer) {
            // Find the selected highlight (yellow one)
            const selectedHighlight = textLayer.querySelector('.highlight.selected');
            if (selectedHighlight) {
              // Calculate the position relative to the pages container
              const pagesContainer = pageContainerRef.current;
              if (pagesContainer) {
                const containerRect = pagesContainer.getBoundingClientRect();
                const highlightRect = selectedHighlight.getBoundingClientRect();
                
                // Calculate scroll position to center the highlight
                const scrollTop = pagesContainer.scrollTop + 
                  (highlightRect.top - containerRect.top) - 
                  (containerRect.height / 2) + 
                  (highlightRect.height / 2);
                
                // Smooth scroll to the highlight
                pagesContainer.scrollTo({
                  top: Math.max(0, scrollTop),
                  behavior: 'smooth'
                });
              }
            }
          }
        }
        break;
      }
      currentIndex += pageMatchCount;
    }
  }, []);

  const updateSearchMatches = useCallback((pageNumber: number, matches: any[]) => {
    // Update matches for this page
    const existingIndex = allSearchMatches.current.findIndex(p => p.pageNumber === pageNumber);
    if (existingIndex >= 0) {
      allSearchMatches.current[existingIndex] = { pageNumber, matches };
    } else {
      allSearchMatches.current.push({ pageNumber, matches });
      // Sort by page number
      allSearchMatches.current.sort((a, b) => a.pageNumber - b.pageNumber);
    }
    
    // Update total count
    searchResultsCount.current = allSearchMatches.current.reduce((total, page) => total + page.matches.length, 0);
  }, []);

  const getCurrentMatchIndex = useCallback((pageNumber: number, matchIndex: number): number => {
    let globalIndex = 0;
    for (const pageMatch of allSearchMatches.current) {
      if (pageMatch.pageNumber === pageNumber) {
        return globalIndex + matchIndex;
      }
      globalIndex += pageMatch.matches.length;
    }
    return -1;
  }, []);

  // Load PDF when URL changes
  useEffect(() => {
    if (pdfUrl) {
      loadFileFromUrl(pdfUrl);
    }
  }, [pdfUrl]);

  // Scroll listener to update current page
  useEffect(() => {
    const pagesContainer = pageContainerRef.current;
    if (!pagesContainer || !state.document) return;

    const handleScroll = () => {
      // Debounce scroll events
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        const containerRect = pagesContainer.getBoundingClientRect();
        const containerTop = containerRect.top;
        const containerHeight = containerRect.height;
        const centerY = containerTop + containerHeight / 2;

        // Find which page is most visible in the center of the viewport
        let closestPage = 1;
        let closestDistance = Infinity;

        for (let i = 1; i <= state.numPages; i++) {
          const pageElement = pagesContainer.querySelector(`[data-page-number="${i}"]`);
          if (pageElement) {
            const pageRect = pageElement.getBoundingClientRect();
            const pageCenter = pageRect.top + pageRect.height / 2;
            const distance = Math.abs(pageCenter - centerY);

            if (distance < closestDistance) {
              closestDistance = distance;
              closestPage = i;
            }
          }
        }

        // Only update if the page actually changed
        if (closestPage !== state.currentPage) {
          setState(prev => ({ ...prev, currentPage: closestPage }));
        }
      }, 100); // 100ms debounce
    };

    pagesContainer.addEventListener('scroll', handleScroll);
    return () => {
      pagesContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [state.document, state.numPages, state.currentPage]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          handlePageChange(Math.max(1, state.currentPage - 1));
          break;
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          handlePageChange(Math.min(state.numPages, state.currentPage + 1));
          break;
        case 'Home':
          event.preventDefault();
          handlePageChange(1);
          break;
        case 'End':
          event.preventDefault();
          handlePageChange(state.numPages);
          break;
        case '+':
        case '=':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleZoomOut();
          }
          break;
        case '0':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            setZoomMode('custom');
            setState(prev => ({ ...prev, scale: 1 }));
          }
          break;
        case 'f':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleSearchToggle();
          }
          break;
        case 's':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            if (fileDataRef.current) {
              handleDownload();
            }
          }
          break;
        case 'p':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handlePrint();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.currentPage, state.numPages, handleZoomIn, handleZoomOut, handlePageChange, handleDownload, handlePrint]);

  // Auto-resize when window or sidebar changes
  useEffect(() => {
    if (zoomMode === 'auto') {
      handleAutoZoom();
    } else if (zoomMode === 'page-fit') {
      handleFitToPage();
    } else if (zoomMode === 'page-width') {
      handleFitToWidth();
    }
  }, [zoomMode, state.sidebarOpen, handleAutoZoom, handleFitToPage, handleFitToWidth]);

  return (
    <div ref={viewerRef} className={`pdf-viewer ${className}`}>
      <Toolbar
        currentPage={state.currentPage}
        numPages={state.numPages}
        scale={state.scale}
        sidebarOpen={state.sidebarOpen}
        searchQuery={state.searchQuery}
        searchOpen={searchOpen}
        searchMatchCase={searchMatchCase}
        searchWholeWords={searchWholeWords}
        zoomMode={zoomMode}
        searchResultsCount={allSearchMatches.current.reduce((total, page) => total + page.matches.length, 0)}
        currentSearchResult={state.currentSearchResult}
        onPageChange={handlePageChange}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomModeChange={handleZoomModeChange}
        onSidebarToggle={handleSidebarToggle}
        onSearchToggle={handleSearchToggle}
        onSearchChange={handleSearchChange}
        onSearchMatchCaseChange={handleSearchMatchCaseChange}
        onSearchWholeWordsChange={handleSearchWholeWordsChange}
        onSearchNext={handleSearchNext}
        onSearchPrev={handleSearchPrev}
        onDownload={handleDownload}
        onPrint={handlePrint}
        isLoading={state.isLoading}
        isPrintLoading={isPrintLoading}
      />

      <div className="viewer-content">
        <Sidebar
          isOpen={state.sidebarOpen}
          document={state.document}
          currentPage={state.currentPage}
          onPageChange={handlePageChange}
          onClose={() => setState(prev => ({ ...prev, sidebarOpen: false }))}
        />

        <div className="main-content">
          {state.error ? (
            <div className="viewer-error">
              <div className="error-icon">⚠️</div>
              <div className="error-text">{state.error}</div>
              <button 
                className="error-retry-button"
                onClick={() => setState(prev => ({ ...prev, error: null }))}
              >
                Try Again
              </button>
            </div>
          ) : state.document ? (
            <div ref={pageContainerRef} className="pages-container">
              {Array.from({ length: state.numPages }, (_, index) => (
                <div key={index + 1} className="page-wrapper">
                  <PageCanvas
                    document={state.document}
                    pageNumber={index + 1}
                    scale={state.scale}
                    searchQuery={state.searchQuery}
                    searchMatchCase={searchMatchCase}
                    searchWholeWords={searchWholeWords}
                    currentSearchResult={state.currentSearchResult}
                    searchTimestamp={state.searchTimestamp}
                    onSearchMatches={updateSearchMatches}
                    getCurrentMatchIndex={getCurrentMatchIndex}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="welcome-screen">
              <div className="welcome-icon">📄</div>
              <h2>PDF Viewer</h2>
              <p>Loading PDF...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;