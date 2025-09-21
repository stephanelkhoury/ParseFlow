# ParseFlow 📊

A beautiful, intelligent web application for importing and visualizing JSON and Excel data with advanced chart capabilities and smart data analysis.

![ParseFlow Demo](https://img.shields.io/badge/Status-Active-green?style=for-the-badge) ![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=for-the-badge) ![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

## 🚀 Live Demo

**[🌐 Try ParseFlow Live on Vercel](https://parseflow.vercel.app)**

## ✨ Key Features

### 🧠 **Smart Chart Intelligence**
- **Automatic Data Analysis**: Intelligent field type detection and pattern recognition
- **Smart Suggestions**: AI-powered chart type recommendations based on your data
- **Interactive Insights**: Real-time data statistics and visualization tips
- **One-Click Generation**: Create optimized charts instantly from suggestions

### 📊 **Advanced Data Import**
- **Universal Support**: JSON and Excel (.xlsx/.xls) file compatibility
- **Complete Data Capture**: Imports ALL records including nested structures
- **Multi-Sheet Processing**: Full Excel workbook support with UTF-8 encoding
- **� Duplicate Detection**: Comprehensive row-by-row comparison prevents data duplication

## 🚀 Quick Start

### Option 1: Direct File Opening
Simply open `index.html` in your web browser. All dependencies are loaded via CDN.

### Option 2: Local Server (Recommended)
```bash
# Clone the repository
git clone https://github.com/stephanelkhoury/ParseFlow.git
cd ParseFlow

# Install dependencies (optional)
npm install

# Start local server
npm start
# or
npm run dev
# or (if you have Python)
npm run serve
```

The application will be available at `http://localhost:3000`

## 📖 How to Use

1. **Upload Files**: 
   - Drag and drop your JSON or Excel files onto the upload area
   - Or click "Choose Files" to select files from your device

2. **View Data**:
   - **Table View**: Browse your data in a paginated table
   - **Chart View**: Create visualizations by selecting X and Y axes
   - **JSON View**: See the raw JSON structure of your data

3. **Analyze**:
   - View automatic statistics including averages, min/max values
   - Filter and sort data in table view
   - Switch between different chart types

4. **Export**:
   - Use the export functions to save processed data

## 📁 Supported File Formats

### JSON Files
- Array of objects: `[{}, {}, ...]`
- Single object: `{}`
- Nested objects with arrays: `{ "data": [{}, {}] }`

### Excel Files
- `.xlsx` (Excel 2007+)
- `.xls` (Excel 97-2003)
- First row is treated as headers
- Multiple sheets supported (first sheet used)

## 🛠️ Technical Stack

- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+)
- **Styling**: Custom CSS with modern design principles
- **Icons**: Font Awesome 6
- **Fonts**: Inter (Google Fonts)
- **Excel Parsing**: SheetJS (xlsx library)
- **Charts**: Chart.js 3.9.1
- **No Build Process**: Ready to run out of the box

## 🎨 Design Features

- **Gradient Backgrounds**: Beautiful color gradients
- **Glassmorphism**: Modern blur effects and transparency
- **Smooth Animations**: CSS transitions and keyframe animations
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode Ready**: Structured for easy dark theme implementation

## 📊 Data Processing

The application automatically:
- Detects data types (numeric, text, dates)
- Calculates statistics for numeric columns
- Handles missing or null values gracefully
- Supports large datasets (optimized rendering)
- Merges multiple files with source tracking

## 🔧 Customization

### Adding New Chart Types
Edit `script.js` and add options to the `chartType` select:
```javascript
// In updateChart() function
const chartTypes = ['bar', 'line', 'pie', 'doughnut', 'radar', 'polarArea'];
```

### Custom Styling
Modify `styles.css` to customize:
- Color schemes
- Typography
- Layout spacing
- Animation effects

### Additional File Formats
Extend file parsing in `script.js`:
```javascript
// Add new parser in processFiles() function
if (ext.endsWith('.csv')) {
    data = await parseCSVFile(file);
}
```

## 📱 Browser Support

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [SheetJS](https://github.com/SheetJS/sheetjs) for Excel file parsing
- [Chart.js](https://www.chartjs.org/) for beautiful charts
- [Font Awesome](https://fontawesome.com/) for icons
- [Google Fonts](https://fonts.google.com/) for typography

## 📞 Support

If you encounter any issues or have questions:
1. Check the browser console for error messages
2. Ensure your files are in supported formats
3. Try with a smaller dataset first
4. Open an issue on GitHub

---

Made with ❤️ by [Your Name]
