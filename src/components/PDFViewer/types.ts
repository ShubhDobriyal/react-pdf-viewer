export interface PDFDocument {
  numPages: number;
  getPage: (pageNum: number) => Promise<PDFPage>;
  getOutline?: () => Promise<any[]>;
  getDestination?: (dest: string) => Promise<any>;
}

export interface PDFPage {
  pageNumber: number;
  getViewport: (options: { scale: number; rotation?: number }) => PDFPageViewport;
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: PDFPageViewport; textLayer?: any; annotationLayer?: any }) => PDFRenderTask;
  getTextContent: () => Promise<any>;
  getAnnotations: () => Promise<any[]>;
}

export interface PDFPageViewport {
  width: number;
  height: number;
  transform: number[];
  clone: (options?: { scale?: number; rotation?: number }) => PDFPageViewport;
}

export interface PDFRenderTask {
  promise: Promise<void>;
  cancel: () => void;
}

export interface ViewerState {
  document: PDFDocument | null;
  currentPage: number;
  numPages: number;
  scale: number;
  sidebarOpen: boolean;
  sidebarView: 'thumbnails' | 'outline' | 'attachments';
  searchQuery: string;
  searchResults: SearchResult[];
  currentSearchResult: number;
  searchTimestamp?: number;
  isLoading: boolean;
  error: string | null;
}

export interface SearchResult {
  pageIndex: number;
  textDivs: HTMLElement[];
  matches: Array<{
    begin: { divIdx: number; offset: number };
    end: { divIdx: number; offset: number };
  }>;
}
