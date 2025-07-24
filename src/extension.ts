

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { List } from 'linqts';

const MD_MAX_HEADERS_LEVEL = 6;
const MD_LANG_ID = "markdown";
const MD_CELL_KIND = vscode.NotebookCellKind["Markup"];

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "jn-toc" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let command1 = vscode.commands.registerCommand('jn-toc.jupyterToc', () => {
        if (vscode.window.activeNotebookEditor?.notebook !== undefined) {
            console.log("Start building TOC...")
            new TocGenerator().process();
        }
        console.log("Command 'jn-toc.jupyterToc' executed");
    });

    let command2 = vscode.commands.registerCommand('jn-toc.jupyterUnToc', () => {
        if (vscode.window.activeNotebookEditor?.notebook !== undefined) {
            console.log("Start removing TOC...")
            new TocGenerator().process(true);
        }
        console.log("Command 'jn-toc.jupyterUnToc' executed");
    });
    
    context.subscriptions.push(command1);
    context.subscriptions.push(command2);
}

// This method is called when your extension is deactivated
export function deactivate() {};


export class TocGenerator {
    private _config: TocConfiguration = new TocConfiguration();
    private _tocDisclimer: string = "<!-- THIS CELL WILL BE REPLACED ON TOC UPDATE. DO NOT WRITE YOUR TEXT IN THIS CELL -->";
    // private _tocHeaderAnchor: string = "<a id='toc0_'></a>";
    private _endAnchor: string = "</a>";
    
    process(remove: boolean = false){
        let editor = vscode.window.activeNotebookEditor;
        let infoMessage = "";
        
        if (editor != undefined) {
            let cells = editor.notebook.getCells();
            let uri = editor.notebook.uri;
            
            if (cells != undefined) {
                // prepare TOC
                this._config = this.readConfiguration(cells);
                let lineHeaders = this.buildLineHeaders(cells);		// all valid headers in notebook
                let headers = this.buildHeaders(lineHeaders);		// filtered, numbered and anchored headers
                let tocSummary : string = this.buildSummary(headers);
                console.log(tocSummary);
                
                // edit headers in document
                cells.forEach((cell: vscode.NotebookCell, cellIndex: number)  => {     		
                    if (vscode.NotebookCellKind[cell.kind] == 'Markup') {
                        // Skip the TOC cell itself - we don't want to modify the TOC cell
                        if (this._config.TocCellNum !== undefined && cellIndex === this._config.TocCellNum) {
                            return; // Skip this cell
                        }
                        
                        let docText = cell.document.getText();
                        let docArray = docText.split(/\r?\n/);
                        let isCellUpdate = false;

                        // CRITICAL: Always remove ALL existing anchors first
                        // This is the key fix - we must clean before processing
                        docArray = this.removeAllAnchors(docArray);
                        isCellUpdate = true;

                        // Now restore headers to clean state
                        // Note: After removeAllAnchors, line numbers may have shifted
                        // We need to find the headers in the cleaned array
                        lineHeaders.ForEach((header) => {
                            if (header != undefined && header.cellNum != undefined && header.cellNum == cellIndex) {
                                let ht = "#".repeat(header.origLevel);
                                let lineText = `${ht} ${header.title}`;
                                
                                // Find the header in the cleaned array by content matching
                                // This is more robust than relying on line numbers that may have shifted
                                for (let i = 0; i < docArray.length; i++) {
                                    if (docArray[i].trim().startsWith(ht) && docArray[i].includes(header.title)) {
                                        docArray[i] = lineText;
                                        break;
                                    }
                                }
                            }
                        });

                        if (!remove) { 
                            // Add new anchors only for headers that belong to this cell
                            headers.ForEach((header) => {
                                if (header != undefined && header.cellNum != undefined && header.cellNum == cellIndex) {                                
                                    let ht = "#".repeat(header.origLevel); // Generate Markdown header level

                                    // Generate anchor only if anchor feature is enabled
                                    let anchor = this._config.Anchor ? `<a id='${header.anchor}'></a>` : ""; 
                                    let title = header.title; // Keep the title clean without additional anchors
                                    
                                    // Construct the header line with optional numbering
                                    let headerLine = (this._config.Numbering)
                                        ? `${ht} ${header.numberingString} ${title}`
                                        : `${ht} ${title}`;
                                    
                                    // Find the header in the cleaned array by content matching
                                    // This is more robust than relying on line numbers that may have shifted
                                    for (let i = 0; i < docArray.length; i++) {
                                        if (docArray[i].trim().startsWith(ht) && docArray[i].includes(title)) {
                                            // Combine the anchor and header line, ensuring correct formatting
                                            // Only add anchor if it's enabled and not empty
                                            if (anchor) {
                                                docArray[i] = `${anchor}\n\n${headerLine}`;  
                                            } else {
                                                docArray[i] = headerLine;
                                            }
                                            break;
                                        }
                                    }
                                }
                            });	
                        }

                        docText = docArray.join("\n");	// cell content with edits

                        if (isCellUpdate && editor != undefined) {
                            this.updateCell(uri, docText, cellIndex);
                        }
                    }
                });

                if (remove) { // Remove TOC cell and anchors
                    cells.forEach((cell: vscode.NotebookCell, cellIndex: number) => { // Iterate through cells with proper indexing
                        if (vscode.NotebookCellKind[cell.kind] == 'Markup') {
                            let docText = cell.document.getText();
                            let docArray: string[] = docText.split(/\r?\n/); // Explicitly type as string[]
                            let isCellUpdate = false;
                
                            // Restore headers and remove anchors
                            lineHeaders.ForEach((header) => {
                                if (header != undefined && header.cellNum != undefined && header.cellNum == cellIndex) {
                                    let ht = "#".repeat(header.origLevel);
                                    let lineText = `${ht} ${header.title}`;
                                    
                                    // Find the header in the array by content matching
                                    // This is more robust than relying on line numbers that may have shifted
                                    for (let i = 0; i < docArray.length; i++) {
                                        if (docArray[i].trim().startsWith(ht) && docArray[i].includes(header.title)) {
                                            docArray[i] = lineText; // Restore original header text
                                            isCellUpdate = true;
                                            break;
                                        }
                                    }
                                }
                            });
                
                            // Remove lines with anchor links and clean up empty lines
                            docArray = this.cleanExistingAnchors(docArray);
                
                            // Reassemble the cell content
                            docText = docArray.join("\n");
                
                            if (isCellUpdate && editor != undefined) {
                                this.updateCell(uri, docText, cellIndex);
                            }
                        }
                    });
                
                    // Remove the TOC cell
                    if (this._config.TocCellNum != undefined) {
                        this.deleteCell(uri, this._config.TocCellNum);
                        infoMessage = `Table of contents removed from Cell #${this._config.TocCellNum}`;
                    }
                } else { // Original TOC updating/inserting logic
                    // Update or insert the TOC cell as before
                    if (this._config.TocCellNum == undefined) {
                        let selected = (editor.selection != undefined) ? editor.selection.start : 0;
                        this.insertCell(uri, tocSummary, selected);
                        infoMessage = `Table of contents inserted as Cell #${selected}`;
                    } else {
                        let tocCellNum = this._config.TocCellNum;
                        this.updateCell(uri, tocSummary, tocCellNum);
                        infoMessage = `Table of contents updated at Cell #${tocCellNum}`;
                    }
                }                

                // save notebook
                if(this._config.AutoSave) {
                    editor.notebook.save();
                }
                
                vscode.window.showInformationMessage(infoMessage);
            }
                
            return Promise.resolve();
        }
    }

    private async deleteCell(uri: vscode.Uri, cellNum: number) {
        const edit = new vscode.WorkspaceEdit();
        let range = new vscode.NotebookRange(cellNum, cellNum + 1);
        edit.set(uri, [vscode.NotebookEdit.deleteCells(range)]);
        await vscode.workspace.applyEdit(edit);
    }

    private async insertCell(uri: vscode.Uri, docText: string, cellNum: number) {
        const edit = new vscode.WorkspaceEdit();
        let tocCell = new vscode.NotebookCellData(MD_CELL_KIND, docText, MD_LANG_ID);	
        edit.set(uri, [vscode.NotebookEdit.insertCells(cellNum, [tocCell])]);
        await vscode.workspace.applyEdit(edit);
    }

    private async updateCell(uri: vscode.Uri, docText: string, cellNum: number){
        const edit = new vscode.WorkspaceEdit();
        let range = new vscode.NotebookRange(cellNum, cellNum + 1);
        let tocCell = new vscode.NotebookCellData(MD_CELL_KIND, docText, MD_LANG_ID);	
        edit.set(uri, [vscode.NotebookEdit.replaceCells(range, [tocCell])]);
        await vscode.workspace.applyEdit(edit);
    }

    readConfiguration(cells: vscode.NotebookCell[]) : TocConfiguration {
        let tocConfiguration: TocConfiguration = new TocConfiguration();
        let readingConfiguration: boolean = false;
        
        cells.forEach((cell, cellIndex)  => {
            if (vscode.NotebookCellKind[cell.kind] == 'Markup') {
                let docText = cell.document.getText();
                let docArray = docText.split(/\r?\n/);
                
                for (var lineNumber = 0; lineNumber < docArray.length ; lineNumber++) {
                    let lineText: string = docArray[lineNumber].trim();
            
                    // Break the loop, cause we read the configuration,
                    // so if several TOC in doc we read config from the first
                    if (lineText.startsWith(tocConfiguration.EndLine)) {
                        break;
                    }

                    if (lineText.startsWith(tocConfiguration.StartLine)) {
                        readingConfiguration = true;
                        tocConfiguration.TocCellNum = cellIndex;
                        
                        // let tocHeader = docArray[0].trim();  /* preserve modified header of Toc */
                        // tocConfiguration.TocHeader = tocHeader.replace(this._tocHeaderAnchor, "");
                        continue;
                    }

                    if (readingConfiguration) {
                        tocConfiguration.Read(lineText);
                    }
                
                }
            }
        });
    
        return tocConfiguration;
    }

    // collect all valid headers from notebook to list
    buildLineHeaders(cells: vscode.NotebookCell[]) : List<Header> {
        let headers = new List<Header>();
        let insideTripleBacktickCodeBlock: boolean = false;
        
        cells.forEach((cell, cellIndex)  => {
            if (vscode.NotebookCellKind[cell.kind] == 'Markup') {
                // Skip the TOC cell itself - we don't want to add anchors to the TOC cell
                if (this._config.TocCellNum !== undefined && cellIndex === this._config.TocCellNum) {
                    return; // Skip this cell
                }
                
                let docText = cell.document.getText();
                let docArray = docText.split(/\r?\n/);

                for (var lineNumber = 0; lineNumber < docArray.length; lineNumber++) {
                    let aLine = docArray[lineNumber];
            
                    //Ignore empty lines and pre-formatted code blocks in the markdown
                    if (isEmptyOrWhitespace(aLine) || isCodeBlockIndent(aLine)) continue;
                    
                    let lineText = aLine.trim();
                    
                    // Skip standalone anchor tags - we don't want to process them as headers
                    if (lineText.match(/^<a id=['"]?toc[\d_]+['"]?><\/a>$/)) {
                        continue;
                    }
                                        
                    //If we are within a triple-backtick code blocks, then ignore
                    if(lineText.startsWith("```")) {
                        insideTripleBacktickCodeBlock = !insideTripleBacktickCodeBlock;
                    }
            
                    if(insideTripleBacktickCodeBlock){
                        continue;	
                    }
                    
                    // if it is possible header
                    if(lineText.startsWith("#")) {
                        let headerLevel : number = getHeaderLevel(lineText);
                        
                        // skip not valid strings (error || more than 6 #)
                        if (headerLevel < 1 || headerLevel > MD_MAX_HEADERS_LEVEL) {
                            continue
                        }
                        
                        // Skip headers that already contain anchor tags
                        // This prevents processing headers that are already formatted
                        if (lineText.includes('<a id=') || lineText.includes('<a id="')) {
                            continue;
                        }
                        
                        // Skip headers that are followed by anchor tags on the next line
                        if (lineNumber + 1 < docArray.length) {
                            const nextLine = docArray[lineNumber + 1].trim();
                            if (nextLine.match(/^<a id=['"]?toc[\d_]+['"]?><\/a>$/)) {
                                continue;
                            }
                        }
                        
                        // Skip headers that are preceded by anchor tags on the previous line
                        // This prevents processing headers that already have anchors placed before them
                        if (lineNumber > 0) {
                            const prevLine = docArray[lineNumber - 1].trim();
                            if (prevLine.match(/^<a id=['"]?toc[\d_]+['"]?><\/a>$/)) {
                                continue;
                            }
                        }
                        
                        let [title, cleanTitle, isContainLinks] = this.normalizeHeader(lineText, headerLevel, this._endAnchor);
                
                        let header = new Header(
                            headerLevel,
                            title, 
                            cleanTitle,
                            isContainLinks,
                            lineNumber, 
                            cellIndex);
                        
                        headers.Add(header);
                    }
                }
            }
        })
    
        return headers;
    }

    // filter headers by level, add to headers numbering and anchors
    buildHeaders(lines: List<Header>) : List<Header> {
        let headers : List<Header> = new List<Header>();
        let levels = new Array<number>(); 
    
        for (var index = this._config.MinLevel; index <= this._config.MaxLevel; index++) {
            levels.push(0);
        }
        
        // normalize levels, add numbering with string
        lines.Where((x) => x != undefined && x.level >= this._config.MinLevel && x.level <= this._config.MaxLevel).ForEach((header) => {
            if (header != undefined) {   /* Why? */ 
                
                header.level = header.level - this._config.MinLevel + 1;	// scale level to min level

                // Have to reset the sublevels (deeper than current)
                for (var lvl = header.level; lvl < MD_MAX_HEADERS_LEVEL; lvl++) {
                    levels[lvl] = 0;
                }
                
                // Have to set to 1 all skipped levels higher than current (i.e. kind of broken TOC structure,
                // like level 5 header follows level 3 header (1.1.1 -> 1.1.1.0.1 -> 1.1.1.1.1)
                for (var lvl = 0; lvl < header.level - 1 ; lvl++) {
                    if (levels[lvl] == 0) {	
                        levels[lvl] = 1
                    };
                }

                // increment current level
                levels[header.level - 1]++;
                    
                header.numbering = Object.assign([], levels);	// copy array of primitive types
                header.setNumberingString();
                header.setAnchor();

                headers.Add(header);
            }
        });
          
      return headers;
    }

    // build string representation of table of contents
    buildSummary(headers: List<Header>): string {
        let tocSummary: string = this._config.TocHeader + "    \n";
    
        if (!this._config.showHtml) {
            tocSummary = "::: {.content-hidden when-format=\"html\"}\n" + tocSummary;
        }
        
        headers.ForEach((header) => {
            if (header != undefined) {
                let title = header.cleanTitle; 
                let tocLine = "";
                let indent = this._config.Flat ? "" : "  ".repeat(header.level - 1).concat("- ");
                
                if (this._config.Numbering && this._config.Anchor) {
                    tocLine = `${indent}${header.numberingString} [${title}](#${header.anchor})`;
                } else if (this._config.Anchor) {
                    tocLine = `${indent}[${title}](#${header.anchor})`;
                } else if (this._config.Numbering) {
                    tocLine = `${indent}${header.numberingString} ${title}`;
                } else {
                    tocLine = `${indent}${title}`;
                }
                
                if (tocLine) {
                    tocSummary = tocSummary.concat(tocLine + "    \n");
                }
            }
        });
    
        if (!this._config.showHtml) {
            tocSummary += "\n:::";
        }
        
        tocSummary = tocSummary.concat("\n" + this._config.Build());
        tocSummary = tocSummary.concat("\n" + this._tocDisclimer);
        
        return tocSummary;
    }    

    /**
     * Clean up existing anchor tags from a cell's content
     * @param docArray Array of lines in the cell
     * @returns Updated array with anchors removed and empty lines cleaned up
     */
    private cleanExistingAnchors(docArray: string[]): string[] {
        // Remove anchor tags and clean up empty lines
        let cleanedArray = docArray.reduce<string[]>((acc, line, index) => {
            // More comprehensive anchor detection - catch various formats
            const isAnchor = line.trim().match(/^<a id=['"]?toc[\d_]+['"]?><\/a>$/);
            const isEmpty = line.trim() === '';
            
            // Skip anchor lines completely
            if (isAnchor) {
                return acc;
            }
            
            // Avoid consecutive empty lines
            if (isEmpty && acc.length > 0 && acc[acc.length - 1].trim() === '') {
                return acc;
            }
            
            acc.push(line);
            return acc;
        }, []);
        
        // Remove leading empty lines
        while (cleanedArray.length > 0 && cleanedArray[0].trim() === '') {
            cleanedArray.shift();
        }
        
        // Remove trailing empty lines
        while (cleanedArray.length > 0 && cleanedArray[cleanedArray.length - 1].trim() === '') {
            cleanedArray.pop();
        }
        
        return cleanedArray;
    }

    /**
     * Completely clean a cell of all existing anchors and header formatting
     * @param docArray Array of lines in the cell
     * @returns Updated array with all anchors and header formatting removed
     */
    private removeAllAnchors(docArray: string[]): string[] {
        // Remove all anchor tags and clean up empty lines
        let cleanedArray = docArray.reduce<string[]>((acc, line, index) => {
            const trimmedLine = line.trim();
            
            // Skip standalone anchor tags completely
            if (trimmedLine.match(/^<a id=['"]?toc[\d_]+['"]?><\/a>$/)) {
                return acc;
            }
            
            // Remove anchor tags from within lines (like headers that contain anchors)
            let cleanedLine = line.replace(/<a id=['"]?toc[\d_]+['"]?><\/a>\s*/g, '');
            
            // Remove any numbering from headers (like "1.2.3 Section Title")
            cleanedLine = cleanedLine.replace(/^#+\s+([0-9]+\.+)+\s*/, (match) => {
                // Keep only the # symbols and add a space
                return match.replace(/[0-9]+\.+/g, '').replace(/\s+/g, ' ');
            });
            
            // Skip empty lines if the previous line was also empty
            if (cleanedLine.trim() === '' && acc.length > 0 && acc[acc.length - 1].trim() === '') {
                return acc;
            }
            
            acc.push(cleanedLine);
            return acc;
        }, []);
        
        // Remove leading empty lines
        while (cleanedArray.length > 0 && cleanedArray[0].trim() === '') {
            cleanedArray.shift();
        }
        
        // Remove trailing empty lines
        while (cleanedArray.length > 0 && cleanedArray[cleanedArray.length - 1].trim() === '') {
            cleanedArray.pop();
        }
        
        return cleanedArray;
    }

    /**
     * 
     * @returns [ cleaned from numbering and anchor header sting (to keep in Cells), 
     *            cleaned from links title (to push to TOC),
     *            flag whether string contain other links ]
     */
    public normalizeHeader(validHeader: string, 
                           headerLevel: number, 
                           endAnchor: string): [string, string, boolean] {
        let isContainLinks = false;

        // remove numbering
        if (validHeader.match(/^\#+\s+([0-9]+\.+)+\s*/) != null) {          // is there some numbering in header after '# ' at the begining of string?
            validHeader = validHeader.replace(/\s*([0-9]+\.*)+\s*/, " ");	// del first numbering, keep if numbers further in the title
        }
        
        // remove hashtag
        let title: string = validHeader.substring(headerLevel + 1);

        // remove existing anchor tags that might be present
        // This handles cases where anchors are already in the header line
        title = title.replace(/<a id=['"]?toc[\d_]+['"]?><\/a>\s*/, '');

        // remove anchor
        if (title.indexOf(endAnchor) > 0) {
            title = title.substring(title.indexOf(endAnchor)  + endAnchor.length);
        }

        // remove TOC link
        const reTocLink = /\[(?<name>[^\[\]]*)\]\(#toc0_\)/;                // any #toc0_ link including empty
        if (reTocLink.test(title)) {           
            let m = title.match(reTocLink);
            if (m != null) {
                let link = m[0];
                let name = m[1];
                title = ((this._config.AnchorStrings.indexOf(name) < 0) && (name != "")) ? name : title.replace(link, "");
            }
        }

        // remove other title links
        const reLink = /\[(?<name>.+?)\]\(.+?\)/;
        let cleanTitle = title;
        if (reLink.test(title)) {
            isContainLinks = true;
            cleanTitle = removeLinks(title);
        }

        return ([title, cleanTitle, isContainLinks]);
    }
}
  
function isEmptyOrWhitespace (text: string): boolean {
    return (!text || text.trim() === "");
};

function isCodeBlockIndent (text: string): boolean {
    return (text.search(/[^\s]./) > 3 || text.startsWith('\t')); // 4+ spaces or 1+ tab
};

function getHeaderLevel(line: string, keepEmpty: boolean = false): number {
    line = line.trim();
    let tag = line.split(" ")[0];
    let hTag = "";

    if (!keepEmpty && line.split(" ").length == 1) {	// empty title
        return -1;
    }

    let hTagMatch = tag.match(/\#+/);

    if (hTagMatch == null) {          	// overcheck if there is no #
        return -1;
    } else {
        hTag = hTagMatch[0];
    }
    
    if (hTag.length < tag.length) {          // there are other than # symbols
        return -1;
    }

    return hTag.length;
}

function removeLinks(line: string): string {
    const reLink = /\[(?<name>.+?)\]\(.+?\)/;
    while (reLink.test(line)) {
        let m = line.match(reLink);
        if (m != null) {
            let link = m[0];
            let name = m[1];
            line = line.slice(0, m.index) + line.slice(m.index).replace(link, name);
        } else {
            break
        }
    }
    return line;
}

class TocConfiguration {
    public TocHeader: string;
    public Numbering: boolean;
    public Flat: boolean;
    public Anchor: boolean;
    public AnchorStyle: string;
    public CustomAnchor: string;
    public MinLevel: number;
    public MaxLevel: number;
    public AutoSave: boolean;
    public AnchorStrings: Array<string>;    // 2 hardcoded and 1 custom strings for anchors 
    public StartLine: string = "<!-- jn-toc-notebook-config";
    public EndLine: string = "/jn-toc-notebook-config -->";
    public showHtml: boolean;

    public TocCellNum?: number;             // ? because we cant set it in constructor
  
    private _numberingKey: string 	= "numbering=";
    private _anchorKey: string 		= "anchor=";
    private _flatKey: string 		= "flat=";
    private _minLevelKey: string 	= "minLevel=";
    private _maxLevelKey: string 	= "maxLevel=";
  
    constructor() {
        this.TocHeader = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('tableOfContentsHeader', "## Contents");
        this.Numbering = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('numbering', false);
        this.Flat = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('flat', false);
        this.Anchor = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('anchors', true);
        this.AnchorStyle = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('reverseAnchorsStyle', "arrow1");
        this.CustomAnchor = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('customReverseAnchor', "&#9757;");
        this.MinLevel = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('minHeaderLevel', 2);
        this.MaxLevel = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('maxHeaderLevel', 4);
        this.AutoSave = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('autoSave', false);
        this.AnchorStrings = ["&#8593;", "&#9650;", this.CustomAnchor];
        this.showHtml = vscode.workspace.getConfiguration('jupyterNotebook.tableOfContents').get('showOnHtml', false);
    }
  
    public Read(lineText: string) {
        if(this.readable(lineText, this._numberingKey)) {
            this.Numbering = this.toBoolean(lineText, this._numberingKey);
        } else if (this.readable(lineText, this._anchorKey)) {
            this.Anchor = this.toBoolean(lineText, this._anchorKey);
        } else if (this.readable(lineText, this._flatKey)) {
            this.Flat = this.toBoolean(lineText, this._flatKey);
        } else if (this.readable(lineText, this._minLevelKey)) {
            let num = this.toNumber(lineText, this._minLevelKey);
            this.MinLevel = (num < 1) ? 1 : num;
        } else if (this.readable(lineText, this._maxLevelKey)) {
            let num = this.toNumber(lineText, this._maxLevelKey);
            this.MaxLevel = (num > MD_MAX_HEADERS_LEVEL) ? MD_MAX_HEADERS_LEVEL : num;
        }
    }
  
    public Build() : string {
        let configuration : string = this.StartLine;
        configuration = configuration.concat("\n\t" + this._numberingKey + this.Numbering);
        configuration = configuration.concat("\n\t" + this._anchorKey + this.Anchor);
        configuration = configuration.concat("\n\t" + this._flatKey + this.Flat);
        configuration = configuration.concat("\n\t" + this._minLevelKey + this.MinLevel);
        configuration = configuration.concat("\n\t" + this._maxLevelKey + this.MaxLevel);
        configuration = configuration.concat("\n\t" + this.EndLine);
    
        return configuration;
    }
  
    private readable(lineText: string, key:string): boolean {
          return (lineText.startsWith(key));
    }
  
    private toBoolean(lineText: string, key: string) : boolean {
        lineText = this.extractValue(lineText, key);
        return (lineText.startsWith("y") || lineText.startsWith("true"));
    }
  
    private toNumber(lineText: string, key: string) : number {
          return Number.parseInt(this.extractValue(lineText, key));
    }
  
    private extractValue(lineText: string, key: string) : string {
          return lineText.slice(key.length, lineText.length).trim().toLowerCase();
    }
}
  

/**
 * Header
 */
class Header {
    level: number;     	// representation header level (relative to min level)
    origLevel: number;     // header level as it was in original document
    title: string;     	// orig title, possible with links on some its parts
    cleanTitle: string;     // title without links to push it in anchored TOC
    isContainLinks: boolean;	// is there are links in original title flag
    numbering: Array<number>;
    numberingString: string;
    lineNumber: number;
    cellNum: number;
    anchor?: string;
  
    constructor(headerLevel: number,
        title: string,
        cleanTitle: string,
        isContainLinks: boolean,	
        lineNumber: number,
        cellNum: number) {
            this.level = headerLevel;
            this.origLevel = headerLevel;
            this.title = title;
            this.cleanTitle = cleanTitle;
            this.isContainLinks = isContainLinks;
            this.numbering = [];
            this.numberingString = "";
            this.lineNumber = lineNumber, 
            this.cellNum = cellNum;
    }

    public setNumberingString() {
        let numberingString = "";
        
        for (let i = 0; i <= MD_MAX_HEADERS_LEVEL; i++){
            if(this.numbering[i] > 0) {
                numberingString = numberingString.concat(this.numbering[i] + ".");
            }
        }

        this.numberingString = numberingString;
    }

    public setAnchor() {
        if (this.numberingString != "") {
            // Generate anchor ID based on numbering, ensuring it ends with underscore
            // This creates anchors like "toc1_", "toc1_2_", "toc1_2_3_"
            this.anchor = "toc" + this.numberingString.split('.').join('_') + "_";
        } else {
            // Fallback for headers without numbering - use a simple counter
            // This should rarely happen but provides a safety net
            this.anchor = "toc" + Math.random().toString(36).substr(2, 9) + "_";
        }
    }
}
