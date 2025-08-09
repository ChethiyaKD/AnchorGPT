# React Chrome Extension Boilerplate

A modern Chrome extension boilerplate built with React 18, Webpack 5, and modern JavaScript tooling.

## Features

- ⚛️ **React 18** with modern hooks and features
- 🛠️ **Webpack 5** for efficient bundling
- 🎨 **Sass/SCSS** support for styling
- 📦 **Modern ES6+** JavaScript with Babel transpilation
- 🔧 **Hot reloading** for development
- 📱 **Chrome Extension Manifest V3** compatible

## Prerequisites

- Node.js (v14 or higher)
- Yarn package manager
- Google Chrome browser

## Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd react-chrome-extension
   ```

2. Install dependencies:
   ```bash
   yarn
   ```

## Development

### Development Mode
Run the development server with hot reloading:
```bash
yarn dev
```

This will:
- Watch for file changes
- Automatically rebuild the extension
- Enable hot reloading for faster development

### Production Build
Build the extension for production:
```bash
yarn build
```

This creates optimized, minified files ready for distribution.

## Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right corner
3. Click "Load unpacked" and select the `dist` folder (after running `yarn build`) or the `public` folder (for development)
4. The extension should now appear in your extensions list

## Project Structure

```
├── public/
│   ├── manifest.json          # Chrome extension manifest
│   └── icons/                 # Extension icons
├── src/
│   ├── popup.jsx             # Extension popup component
│   ├── content.jsx           # Content script
│   ├── background.jsx        # Background script
│   ├── popup.html            # Popup HTML template
│   └── controllers/          # Utility controllers
├── webpack.config.js         # Base webpack configuration
├── webpack.dev.js           # Development webpack config
├── webpack.prod.js          # Production webpack config
└── package.json
```

## Configuration

### Webpack Entry Points
Configure your JavaScript entry points in **webpack.config.js**:
```javascript
entry: {
  popup: "./src/popup.jsx",
  content: "./src/content.jsx",
  background: "./src/background.jsx",
},
```

### Chrome Extension Manifest
Update the `public/manifest.json` file to configure your extension's permissions, icons, and behavior.

## React 18 Features

This boilerplate uses React 18 with the following modern features:
- **Concurrent Features** for better performance
- **Automatic Batching** for state updates
- **Suspense** for data fetching
- **New Root API** with `createRoot`

## Dependencies

### Core Dependencies
- **React 18.2.0** - Modern React with latest features
- **React DOM 18.2.0** - React rendering for web
- **React Custom Checkbox** - Custom checkbox components
- **React Flags Select** - Country flag selection
- **React Select Search** - Searchable select components

### Development Dependencies
- **Webpack 5** - Module bundler
- **Babel 7** - JavaScript transpiler
- **Sass** - CSS preprocessor
- **Various loaders** for handling different file types

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

ISC License

## Support

For issues and questions, please open an issue on the repository.

# AnchorGPT
