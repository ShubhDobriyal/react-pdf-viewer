import React, { useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Search,
  Download,
  Printer,
  Sidebar
} from 'lucide-react';

interface ToolbarProps {
  currentPage: number;
  numPages: number;
  scale: number;
  zoomMode: 'custom' | 'auto' | 'page-fit' | 'page-width';
  sidebarOpen: boolean;
  searchQuery: string;
  searchOpen: boolean;
  searchMatchCase: boolean;
  searchWholeWords: boolean;
  searchResultsCount?: number;
  currentSearchResult?: number;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomModeChange: (mode: string) => void;
  onSidebarToggle: () => void;
  onSearchToggle: () => void;
  onSearchChange: (query: string) => void;
  onSearchMatchCaseChange: (matchCase: boolean) => void;
  onSearchWholeWordsChange: (wholeWords: boolean) => void;
  onSearchNext: () => void;
  onSearchPrev: () => void;
  onDownload: () => void;
  onPrint: () => void;
  isLoading: boolean;
  isPrintLoading: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
  currentPage,
  numPages,
  scale,
  zoomMode,
  sidebarOpen,
  searchQuery,
  searchOpen,
  searchMatchCase,
  searchWholeWords,
  searchResultsCount = 0,
  currentSearchResult = 0,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onZoomModeChange,
  onSidebarToggle,
  onSearchToggle,
  onSearchChange,
  onSearchMatchCaseChange,
  onSearchWholeWordsChange,
  onSearchNext,
  onSearchPrev,
  onDownload,
  onPrint,
  isLoading,
  isPrintLoading
}) => {
  const pageInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handlePageInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Don't navigate on every keystroke, just update the input value
    // Navigation happens on Enter key or blur
  };

  const handlePageInputKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const target = event.target as HTMLInputElement;
      const pageNum = parseInt(target.value, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
        onPageChange(pageNum);
      } else {
        // Reset to current page if invalid
        target.value = currentPage.toString();
      }
      target.blur(); // Remove focus after navigation
    }
  };

  const handlePageInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const target = event.target as HTMLInputElement;
    const pageNum = parseInt(target.value, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      onPageChange(pageNum);
    } else {
      // Reset to current page if invalid
      target.value = currentPage.toString();
    }
  };

  const handleZoomSelect = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onZoomModeChange(event.target.value);
  };

  const getZoomSelectValue = () => {
    if (zoomMode === 'auto') return 'auto';
    if (zoomMode === 'page-fit') return 'page-fit';
    if (zoomMode === 'page-width') return 'page-width';
    
    // For custom zoom, find closest predefined value or use actual scale
    const predefinedScales = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
    const closest = predefinedScales.find(s => Math.abs(s - scale) < 0.01);
    return closest ? closest.toString() : scale.toFixed(2);
  };

  const formatZoomPercentage = (scale: number) => {
    return Math.round(scale * 100) + '%';
  };

  const handleSearchToggle = () => {
    onSearchToggle();
    if (!searchOpen) {
      // Focus search input when opening
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      onSearchToggle();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (event.shiftKey) {
        onSearchPrev();
      } else {
        onSearchNext();
      }
    }
  };
  return (
    <div className="pdf-toolbar" style={{ position: 'relative' }}>
      <div className="toolbar-left">
        <button
          className="toolbar-button"
          onClick={onSidebarToggle}
          title="Toggle Sidebar"
          aria-label="Toggle Sidebar"
        >
          <Sidebar size={16} />
        </button>
        
        <div className="toolbar-separator" />
        
        <button
          className="toolbar-button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1 || isLoading}
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft size={16} />
        </button>
        
        <button
          className="toolbar-button"
          onClick={() => onPageChange(Math.min(numPages, currentPage + 1))}
          disabled={currentPage >= numPages || isLoading}
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight size={16} />
        </button>
        
        <div className="page-controls">
          <input
            ref={pageInputRef}
            type="number"
            min="1"
            max={numPages}
            value={currentPage}
            onChange={handlePageInputChange}
            onKeyPress={handlePageInputKeyPress}
            onBlur={handlePageInputBlur}
            className="page-input"
            disabled={isLoading}
            aria-label="Current Page"
            inputMode="numeric"
          />
          <span className="page-label">of {numPages}</span>
        </div>
        
        <div className="toolbar-separator" />
        
        <button
          className="toolbar-button"
          onClick={onZoomOut}
          disabled={scale <= 0.1 || isLoading}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        
        <button
          className="toolbar-button"
          onClick={onZoomIn}
          disabled={scale >= 10 || isLoading}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        
        <select
          className="scale-select"
          value={getZoomSelectValue()}
          onChange={handleZoomSelect}
          disabled={isLoading}
          aria-label="Zoom Level"
        >
          <option value="auto">Automatic Zoom</option>
          <option value="page-fit">Fit</option>
          <option value="page-width">Fit Width</option>
          <option value="0.5">50%</option>
          <option value="0.75">75%</option>
          <option value="1">100%</option>
          <option value="1.25">125%</option>
          <option value="1.5">150%</option>
          <option value="2">200%</option>
          <option value="3">300%</option>
          <option value="4">400%</option>
          {zoomMode === 'custom' && !['0.5', '0.75', '1', '1.25', '1.5', '2', '3', '4'].includes(scale.toFixed(2)) && (
            <option value={scale.toFixed(2)}>{formatZoomPercentage(scale)}</option>
          )}
        </select>
      </div>
      
      <div className="toolbar-right">
        <button
          className="toolbar-button"
          onClick={onDownload}
          title="Save"
          aria-label="Save"
          disabled={!numPages}
        >
          <Download size={16} />
        </button>
        
        <button
          className="toolbar-button"
          onClick={onPrint}
          title="Print"
          aria-label="Print"
          disabled={!numPages || isPrintLoading}
        >
          {isPrintLoading ? (
            <div className="loading-spinner-small" />
          ) : (
            <Printer size={16} />
          )}
        </button>
        
        <div className="toolbar-separator" />
        
        <button
          className={`toolbar-button ${searchOpen ? 'active' : ''}`}
          onClick={handleSearchToggle}
          title="Find"
          aria-label="Find"
          disabled={!numPages || isLoading}
        >
          <Search size={16} />
        </button>
      </div>
      
      {/* Search Popover */}
      {searchOpen && (
        <div className="search-popover">
          <div className="search-popover-content">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Find in document…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="search-popover-input"
              aria-label="Find in document"
            />
            <div className="search-popover-controls">
              {searchQuery && (
                <div className="search-results-info">
                  {searchResultsCount > 0 ? (
                    <span className="search-results-count">
                      {currentSearchResult + 1} of {searchResultsCount}
                    </span>
                  ) : searchQuery.trim() ? (
                    <span className="search-results-count">
                      0 of 0
                    </span>
                  ) : null}
                </div>
              )}
              <div className="search-navigation">
                <button
                  className="search-nav-button"
                  onClick={onSearchPrev}
                  title="Find the previous occurrence of the phrase"
                  aria-label="Find previous"
                  disabled={searchResultsCount === 0}
                >
                  <ChevronLeft size={12} />
                </button>
                <button
                  className="search-nav-button"
                  onClick={onSearchNext}
                  title="Find the next occurrence of the phrase"
                  aria-label="Find next"
                  disabled={searchResultsCount === 0}
                >
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
            <div className="search-options">
              <label className="search-option">
                <input
                  type="checkbox"
                  checked={searchMatchCase}
                  onChange={(e) => onSearchMatchCaseChange(e.target.checked)}
                  className="search-checkbox"
                />
                <span className="search-option-label">Match case</span>
              </label>
              <label className="search-option">
                <input
                  type="checkbox"
                  checked={searchWholeWords}
                  onChange={(e) => onSearchWholeWordsChange(e.target.checked)}
                  className="search-checkbox"
                />
                <span className="search-option-label">Whole words</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Toolbar;