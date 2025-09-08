# PDF.js Viewer - React Component

A production-ready, feature-complete PDF viewer component built with React and PDF.js that replicates the functionality of Mozilla's official PDF.js viewer.

## Features

### Core Functionality
- 📄 **Complete PDF Rendering** - High-quality PDF page rendering with text and annotation layers
- 🔍 **Advanced Search** - Full-text search with highlighting and navigation
- 📱 **Responsive Design** - Works seamlessly across desktop, tablet, and mobile devices
- ⌨️ **Keyboard Shortcuts** - Complete keyboard navigation support
- 🎯 **Accessibility** - ARIA labels, keyboard navigation, and screen reader support

### Toolbar Features
- 📂 **File Operations** - Upload, download, and print PDFs
- 🔍 **Zoom Controls** - Zoom in/out, fit to width, fit to page, custom zoom levels
- 📖 **Page Navigation** - Previous/next page, jump to specific page
- 🔄 **Page Rotation** - Rotate pages clockwise
- 🔍 **Search Bar** - Real-time search with match highlighting

### Sidebar Features
- 🖼️ **Thumbnails** - Visual page thumbnails for quick navigation  
- 🔖 **Document Outline** - Bookmarks/table of contents navigation
- 📎 **Attachments** - View document attachments (when available)

### Performance & Quality
- ⚡ **Optimized Rendering** - Efficient handling of large multi-page documents
- 🎨 **High-Quality Output** - Crisp text and graphics at all zoom levels
- 💾 **Memory Management** - Smart loading and cleanup for large files
- 🔄 **Error Handling** - Robust error handling with user-friendly messages

## Installation

```bash
npm install pdfjs-dist lucide-react
```

## Usage

### Basic Usage

```tsx
import React from 'react';
import PDFViewer from './components/PDFViewer';

function App() {
  return (
    <div className="App">
      <PDFViewer 
        pdfUrl="https://example.com/document.pdf"
      />
    </div>
  );
}

export default App;
```

### Advanced Usage with Event Handlers

```tsx
import React from 'react';
import PDFViewer from './components/PDFViewer';

function App() {
  const handleError = (error: string) => {
    console.error('PDF Viewer Error:', error);
    // Handle error (show notification, etc.)
  };

  const handleDocumentLoad = (document: any) => {
    console.log('Document loaded:', {
      pages: document.numPages,
      fingerprint: document.fingerprint
    });
  };

  return (
    <div style={{ height: '100vh' }}>
      <PDFViewer
        pdfUrl="https://example.com/sample.pdf"
        onError={handleError}
        onDocumentLoad={handleDocumentLoad}
        className="my-pdf-viewer"
      />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `pdfUrl` | `string` | **required** | URL to PDF file to load |
| `className` | `string` | `''` | Additional CSS class for the viewer |
| `onError` | `(error: string) => void` | `undefined` | Called when an error occurs |
| `onDocumentLoad` | `(document: any) => void` | `undefined` | Called when a document is loaded |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `←` / `PageUp` | Previous page |
| `→` / `PageDown` | Next page |  
| `Home` | First page |
| `End` | Last page |
| `Ctrl/Cmd + +` | Zoom in |
| `Ctrl/Cmd + -` | Zoom out |
| `Ctrl/Cmd + 0` | Reset zoom |
| `Ctrl/Cmd + F` | Focus search |
| `Ctrl/Cmd + S` | Download PDF |
| `Ctrl/Cmd + P` | Print PDF |

## Browser Support

- Chrome 60+
- Firefox 60+ 
- Safari 12+
- Edge 79+

## File Size Limits

- Maximum file size: 100MB
- Supported format: PDF only
- Memory usage optimized for large documents

## Architecture

The component is built with a modular architecture:

```
PDFViewer/
├── PDFViewer.tsx      # Main component with state management
├── Toolbar.tsx        # Top toolbar with controls
├── Sidebar.tsx        # Left sidebar with thumbnails/outline
├── PageCanvas.tsx     # Individual page rendering
├── types.ts          # TypeScript interfaces
├── utils.ts          # PDF.js utilities and helpers
└── styles.css        # Complete styling
```

## Customization

The component uses CSS custom properties that can be overridden:

```css
.pdf-viewer {
  --toolbar-bg: #474747;
  --sidebar-bg: white;
  --accent-color: #0078d4;
  --text-color: #333;
}
```

## Performance Tips

1. **Large Files**: For files over 50MB, consider implementing progressive loading
2. **Memory**: The component automatically manages memory for optimal performance  
3. **Search**: Search is debounced by 300ms to prevent excessive processing
4. **Thumbnails**: Only first 20 thumbnails are generated initially

## Error Handling

The component includes comprehensive error handling:

- Invalid file format detection
- Network request failures  
- PDF parsing errors
- Rendering errors
- Memory constraints

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new features
3. Include appropriate ARIA labels for accessibility
4. Test across different browsers and devices
5. Update documentation for any new props or features

## License

MIT License - see LICENSE file for details.

## Credits

Built with [PDF.js](https://mozilla.github.io/pdf.js/) by Mozilla and [Lucide React](https://lucide.dev/) for icons.