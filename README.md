# Jupyter table of contents (TOC) generation support for Visual Studio Code

  - [1. Summary](#1-summary)
  - [2. Features](#2-features)
  - [3. Example](#3-example)
  - [4. Usage](#4-usage)
    - [4.1. Some details and tips](#41-some-details-and-tips)
  - [5. Supported settings](#5-supported-settings)
  - [6. Known issues and roadmap](#6-known-issues-and-roadmap)
  - [6. About](#6-about)

## 1. Summary 

Generatation of a **table of contents** (TOC) for your Jupyter notebook in [Visual Studio Code](https://code.visualstudio.com/).

Visual Studio Code has "outline" feature to navigate through the jupyter notebook markdown headers. But if this feature is not enough this extension let you to generate interactive TOC directly in jupyter notebook as a separate markdown cell.

## 2. Features 

* Generate a table of contents based on markdown titles
* Update an existing TOC when generate it again
* Support not latin headers in Jupyter notebook
* Insert anchors both on your elements of TOC and on headers
    * backward links from document titles to table of contents
* Auto-saving when a TOC is generated 
* Configurable:
    * Levels of headers to numerate and collect to TOC
    * Numbering your table of contents and headers
    * Anchoring you table of contents and headers
    * Display name for the table of contents
    * Save your document when table of contents generated

## 3. Example

**Generating** Table of contents    
<img src="https://raw.githubusercontent.com/xelad0m/vscode-jupyter-toc/main/images/generate.gif" alt="generate" width="700px">

**Removing** table of contents    
<img src="https://raw.githubusercontent.com/xelad0m/vscode-jupyter-toc/main/images/remove.gif" alt="generate" width="700px">

**Configuring** and **updating** table of contents (e.g. changing levels of TOC from defalut 1-6 to 1-4)    
<img src="https://raw.githubusercontent.com/xelad0m/vscode-jupyter-toc/main/images/config.gif" alt="generate" width="700px">

## 4. Usage

All commands are available as **Editor Toolbar menu** items under the overflow menu **(...)**

Also you can use **comand palette**

* Open any Jupyter notebook
* Open the command palette (`Ctrl+Shift+P`)

Adding new or updating existing Table of contents:

* Start typing "**Generate**"
* Choose "**Juptyer: Generate table of contents**"
  * New cell with TOC for notebook will be inserted before current selected cell or existing TOC will be updated

Removing Table of contents

* Start typing "**Remove**"
* Choose "**Juptyer: Remove table of contents**"
  * Notebook cell with table of contents will be removed from notebook. All made formatting of headers such as numbering and anchors will be removed too.

### 4.1. Some details and tips

1. Jupyter notebook cell with generated TOC on update replaces with new one so there is no sence to place in it any other text data.
2. Default settings for TOC generation can be changed via `File - Preferences - Settings - Jupyter TOC` section. Or choose this extension in Extension browser (`Ctrl+Shift+X`), than press `Manage` button, choose `Extension settings`.
3. The settings for a particular Jupyter notebook can be overrided by editing the settings directly in the in the bottom of cell with the table of contents. These settings will have the highest priority for the subsequent generation/update of the table of contents in this document.

## 5. Supported settings

Key|Expected Values|Default|Description
:---|:---:|:---:|:---
`jupyter.toc.tableOfContentsHeader`|`string`|**Table of contents**|Defines the name for the table of contents
`jupyter.toc.autoSave`|`boolean`|`false`|Determines whether to automatically save the notebook after creating, updating, or deleting the table of contents.
`jupyter.toc.numbering`|`boolean`|`false`|Determines whether the headers need to be numbered.
`jupyter.toc.anchors`|`boolean`|`true`|Determines whether the table of contents elements should refer to the headings in the document.
`jupyter.toc.minHeaderLevel`|`1-6`|`1`|Defines the minimum level of the header to be included in the table of contents.
`jupyter.toc.maxHeaderLevel`|`1-6`|`6`|Defines the maximum level of the header to be included in the table of contents.
`jupyter.toc.reverseAnchorsStyle`|`["title", "arrow1", "arrow2", "arrow3", "arrow4", "custom"]`|`title`|Styles of links from titles to the table of contents
`jupyter.toc.customReverseAnchor`|`string`|`&#9757;`|Defines anchor symbol or string to use as link from headers to the TOC. Its (&#9757;) by default

Styles of links from titles to the table of contents
#### [Title](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)
#### arrow1 [&#8593;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)
#### [&#8593;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc) arrow2
#### arrow3 [&#9650;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)
#### [&#9650;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc) arrow4
#### default custom [&#9757;](https://marketplace.visualstudio.com/items?itemName=xelad0m.jupyter-toc)


## 6. Known issues and roadmap

1. Anchor navigation from TOC to headers and back does not work on github due to its jupyter notebook renderer, but with native `jupyter notebook` it works well.
2. TODO: Compatibility with built-in Undo/Redo functionality

## 6. About

This extension is based on [Markdown TOC](https://marketplace.visualstudio.com/items?itemName=joffreykern.markdown-toc) Visual Studio Code extension by [Joffrey Kern](https://github.com/joffreykern/vscode-markdown-toc) and [Kiran Rao](https://github.com/curioustechizen/vscode-markdown-toc).

Special thanks to [Your First Extension](https://code.visualstudio.com/api/get-started/your-first-extension) manual.

File bugs, feature requests in [GitHub Issues](https://github.com/xelad0m/vscode-jupyter-toc/issues).
