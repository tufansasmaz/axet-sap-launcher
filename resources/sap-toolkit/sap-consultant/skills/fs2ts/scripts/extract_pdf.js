#!/usr/bin/env node
/**
 * extract_pdf.js — Extract text from PDF using pdfjs-dist
 *
 * Usage:
 *   node extract_pdf.js <pdf_path> [output_txt_path]
 *
 * If output_txt_path is not provided, prints to stdout.
 */

const fs = require('fs');
const path = require('path');

async function extractPdfText(pdfPath) {
    // Dynamic import for ES module compatibility
    const pdfjsLib = require('pdfjs-dist');

    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data }).promise;

    let fullText = '';
    const numPages = doc.numPages;

    console.error(`[extract_pdf] Processing ${numPages} pages...`);

    for (let i = 1; i <= numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(' ');
        fullText += `=== PAGE ${i} ===\n${text}\n\n`;
    }

    return fullText;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('Usage: node extract_pdf.js <pdf_path> [output_txt_path]');
        process.exit(1);
    }

    const pdfPath = args[0];
    const outputPath = args[1];

    if (!fs.existsSync(pdfPath)) {
        console.error(`[extract_pdf] ERROR: File not found: ${pdfPath}`);
        process.exit(1);
    }

    try {
        const text = await extractPdfText(pdfPath);

        if (outputPath) {
            fs.writeFileSync(outputPath, text, 'utf-8');
            console.error(`[extract_pdf] Written: ${outputPath}`);
        } else {
            console.log(text);
        }

        process.exit(0);
    } catch (error) {
        console.error(`[extract_pdf] ERROR: ${error.message}`);
        process.exit(1);
    }
}

main();
