import LocalStorageDatabase from './LocalStorageDatabase.js';

/**
 * Parser Manager
 * Manages multiple parser instances with their own databases
 */
class ParserManager {
    constructor() {
        this.parsers = new Map();
        this.activeParser = null;
        this.storageKey = 'parseflow_parsers';
        this.initialized = false;
    }

    async initialize() {
        try {
            // Load existing parsers
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parserData = JSON.parse(stored);
                
                // Restore parsers
                for (const parserInfo of parserData.parsers) {
                    await this.createParser(parserInfo.name, parserInfo.description, false);
                }
                
                // Set active parser
                if (parserData.activeParser && this.parsers.has(parserData.activeParser)) {
                    this.activeParser = parserData.activeParser;
                }
            }
            
            // Create default parser if none exist
            if (this.parsers.size === 0) {
                await this.createParser('default', 'Default Parser', true);
            }
            
            this.initialized = true;
            console.log('ParserManager initialized with', this.parsers.size, 'parsers');
        } catch (error) {
            console.error('Error initializing ParserManager:', error);
            // Create default parser on error
            await this.createParser('default', 'Default Parser', true);
        }
    }

    async createParser(name, description = '', setAsActive = false) {
        if (this.parsers.has(name)) {
            throw new Error(`Parser '${name}' already exists`);
        }

        // Validate parser name
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            throw new Error('Parser name is required');
        }

        // Sanitize name for storage
        const sanitizedName = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');

        const parser = {
            name: sanitizedName,
            displayName: name.trim(),
            description: description || `Parser for ${name}`,
            database: new LocalStorageDatabase(sanitizedName),
            created: new Date().toISOString(),
            lastUsed: new Date().toISOString()
        };

        // Initialize the database
        await parser.database.initialize();

        this.parsers.set(sanitizedName, parser);

        if (setAsActive || !this.activeParser) {
            this.activeParser = sanitizedName;
        }

        this.saveToStorage();
        return sanitizedName;
    }

    getParser(name) {
        return this.parsers.get(name);
    }

    getAllParsers() {
        return Array.from(this.parsers.entries()).map(([name, parser]) => ({
            name: name,
            displayName: parser.displayName,
            description: parser.description,
            created: parser.created,
            lastUsed: parser.lastUsed,
            isActive: this.activeParser === name,
            statistics: parser.database.getStatistics()
        }));
    }

    setActiveParser(name) {
        if (!this.parsers.has(name)) {
            throw new Error(`Parser '${name}' does not exist`);
        }

        this.activeParser = name;
        
        // Update last used timestamp
        const parser = this.parsers.get(name);
        parser.lastUsed = new Date().toISOString();
        
        this.saveToStorage();
        return true;
    }

    getActiveParser() {
        if (!this.activeParser || !this.parsers.has(this.activeParser)) {
            return null;
        }
        return this.parsers.get(this.activeParser);
    }

    getActiveDatabase() {
        const activeParser = this.getActiveParser();
        return activeParser ? activeParser.database : null;
    }

    deleteParser(name) {
        if (!this.parsers.has(name)) {
            throw new Error(`Parser '${name}' does not exist`);
        }

        if (name === 'default') {
            throw new Error('Cannot delete the default parser');
        }

        if (this.parsers.size <= 1) {
            throw new Error('Cannot delete the last parser');
        }

        // Clear the database data
        const parser = this.parsers.get(name);
        parser.database.clearData();

        // Remove from parsers
        this.parsers.delete(name);

        // Update active parser if necessary
        if (this.activeParser === name) {
            const remainingParsers = Array.from(this.parsers.keys());
            this.activeParser = remainingParsers[0];
        }

        this.saveToStorage();
        return true;
    }

    duplicateParser(sourceName, newName, newDescription = '') {
        if (!this.parsers.has(sourceName)) {
            throw new Error(`Source parser '${sourceName}' does not exist`);
        }

        const sanitizedNewName = newName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        
        if (this.parsers.has(sanitizedNewName)) {
            throw new Error(`Parser '${newName}' already exists`);
        }

        // Create new parser
        this.createParser(newName, newDescription || `Copy of ${sourceName}`);

        // Copy data from source parser
        const sourceParser = this.parsers.get(sourceName);
        const newParser = this.parsers.get(sanitizedNewName);
        
        const sourceData = sourceParser.database.getAllRecords();
        if (sourceData.length > 0) {
            newParser.database.addRecords(
                sourceData.map(record => {
                    const { _metadata, ...data } = record;
                    return data;
                }), 
                `copied_from_${sourceName}`
            );
        }

        this.saveToStorage();
        return sanitizedNewName;
    }

    renameParser(oldName, newName) {
        if (!this.parsers.has(oldName)) {
            throw new Error(`Parser '${oldName}' does not exist`);
        }

        if (oldName === 'default') {
            throw new Error('Cannot rename the default parser');
        }

        const sanitizedNewName = newName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        
        if (this.parsers.has(sanitizedNewName)) {
            throw new Error(`Parser '${newName}' already exists`);
        }

        const parser = this.parsers.get(oldName);
        parser.displayName = newName.trim();
        parser.name = sanitizedNewName;

        // Update the database storage key
        const oldDatabase = parser.database;
        parser.database = new LocalStorageDatabase(sanitizedNewName);
        
        // Copy data to new database
        const data = oldDatabase.getAllRecords();
        if (data.length > 0) {
            parser.database.addRecords(
                data.map(record => {
                    const { _metadata, ...cleanData } = record;
                    return cleanData;
                }), 
                'renamed_parser_data'
            );
        }

        // Clear old database
        oldDatabase.clearData();

        // Update parsers map
        this.parsers.delete(oldName);
        this.parsers.set(sanitizedNewName, parser);

        // Update active parser if necessary
        if (this.activeParser === oldName) {
            this.activeParser = sanitizedNewName;
        }

        this.saveToStorage();
        return sanitizedNewName;
    }

    getParserStatistics() {
        const stats = {
            totalParsers: this.parsers.size,
            totalRecords: 0,
            totalChecked: 0,
            totalSources: new Set(),
            parsers: []
        };

        for (const [name, parser] of this.parsers.entries()) {
            const parserStats = parser.database.getStatistics();
            stats.totalRecords += parserStats.totalRecords;
            stats.totalChecked += parserStats.checkedRecords;
            
            parserStats.sources.forEach(source => stats.totalSources.add(source));
            
            stats.parsers.push({
                name: name,
                displayName: parser.displayName,
                ...parserStats
            });
        }

        stats.totalSources = stats.totalSources.size;
        return stats;
    }

    exportParser(name, format = 'json') {
        if (!this.parsers.has(name)) {
            throw new Error(`Parser '${name}' does not exist`);
        }

        const parser = this.parsers.get(name);
        const data = parser.database.exportData(format);
        
        return {
            parserName: parser.displayName,
            exported: new Date().toISOString(),
            format: format,
            data: data
        };
    }

    importToParser(name, data, source) {
        if (!this.parsers.has(name)) {
            throw new Error(`Parser '${name}' does not exist`);
        }

        const parser = this.parsers.get(name);
        parser.lastUsed = new Date().toISOString();
        
        const result = parser.database.addRecords(data, source);
        this.saveToStorage();
        
        return result;
    }

    saveToStorage() {
        try {
            const parserData = {
                activeParser: this.activeParser,
                parsers: Array.from(this.parsers.entries()).map(([name, parser]) => ({
                    name: name,
                    displayName: parser.displayName,
                    description: parser.description,
                    created: parser.created,
                    lastUsed: parser.lastUsed
                }))
            };

            localStorage.setItem(this.storageKey, JSON.stringify(parserData));
        } catch (error) {
            console.error('Error saving ParserManager to storage:', error);
            throw new Error('Failed to save parser configuration');
        }
    }
}

export default ParserManager;
