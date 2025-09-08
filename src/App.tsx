import React from 'react';
import PDFViewer from './components/PDFViewer';

function App() {
  const handleError = (error: string) => {
    console.error('PDF Viewer Error:', error);
  };

  const handleDocumentLoad = (document: any) => {
    console.log('PDF Document Loaded:', {
      numPages: document.numPages,
      fingerprint: document.fingerprint
    });
  };

  return (
    <div className="App">
      <PDFViewer
        pdfUrl="https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf"
        onError={handleError}
        onDocumentLoad={handleDocumentLoad}
      />
    </div>
  );
}

export default App;