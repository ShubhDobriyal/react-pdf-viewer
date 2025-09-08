import React, { useState, useEffect, useRef } from 'react';
import { FileText } from './icons';

interface SidebarProps {
  isOpen: boolean;
  document: any;
  currentPage: number;
  onPageChange: (page: number) => void;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  document,
  currentPage,
  onPageChange,
  onClose
}) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [isLoadingThumbnails, setIsLoadingThumbnails] = useState(false);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);

  useEffect(() => {
    if (document && isOpen) {
      generateThumbnails();
    }
  }, [document, isOpen]);

  const generateThumbnails = async () => {
    if (!document || isLoadingThumbnails) return;
    
    setIsLoadingThumbnails(true);
    const newThumbnails: string[] = [];
    canvasRefs.current = new Array(document.numPages).fill(null);

    try {
      for (let i = 1; i <= Math.min(document.numPages, 20); i++) { // Limit initial thumbnails
        const page = await document.getPage(i);
        const viewport = page.getViewport({ scale: 0.2 });
        
        const canvas = window.document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;

        newThumbnails[i - 1] = canvas.toDataURL();
      }
      
      setThumbnails(newThumbnails);
    } catch (error) {
      console.error('Error generating thumbnails:', error);
    } finally {
      setIsLoadingThumbnails(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="pdf-sidebar">

      <div className="sidebar-content">
        <div className="thumbnails-panel">
          {isLoadingThumbnails ? (
            <div className="loading-message">Generating thumbnails...</div>
          ) : (
            <div className="thumbnails-grid">
              {thumbnails.map((thumbnail, index) => (
                <div
                  key={index}
                  className={`thumbnail-item ${currentPage === index + 1 ? 'active' : ''}`}
                  onClick={() => onPageChange(index + 1)}
                >
                  <div className="thumbnail-image">
                    {thumbnail ? (
                      <img src={thumbnail} alt={`Page ${index + 1}`} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <FileText size={24} />
                      </div>
                    )}
                  </div>
                  <div className="thumbnail-label">
                    {index + 1}
                  </div>
                </div>
              ))}
              {/* Show placeholders for remaining pages */}
              {Array.from({ length: Math.max(0, (document?.numPages || 0) - thumbnails.length) }, (_, index) => (
                <div
                  key={thumbnails.length + index}
                  className={`thumbnail-item ${currentPage === thumbnails.length + index + 1 ? 'active' : ''}`}
                  onClick={() => onPageChange(thumbnails.length + index + 1)}
                >
                  <div className="thumbnail-image">
                    <div className="thumbnail-placeholder">
                      <FileText size={24} />
                    </div>
                  </div>
                  <div className="thumbnail-label">
                    {thumbnails.length + index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;