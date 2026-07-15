
import { splitPlainTextIntoPages, htmlToPlainText } from './src/utils/sanitizeHtml';

// Mocking browser environment globals if needed, but the core logic should work in Node
// for splitPlainTextIntoPages since it uses Array.from and findPageBreakOffset

const testBengali = "এটা একটা কঠিন প্র্যাকটিস। আজকের দিনের মাত্র এক ঘণ্টা পার করলাম।";
// প্র্যাকটিস is at index 15-22 approx. 
// units: "এ", "ট", "া", " ", "এ", "ক", "ট", "া", " ", "ক", "ঠ", "ি", "ন", " ", "প", "্র", "্য", "া", "ক", "ট", "ি", "স", "।", ...

console.log("Full string length (Array.from):", Array.from(testBengali).length);

// Test hard cut prevention
// If we set limit to 18, it would fall inside 'প্র্যাকটিস'
const pages = splitPlainTextIntoPages(testBengali, 18);
console.log("Pages (limit 18):");
pages.forEach((p, i) => console.log(`Page ${i + 1}: [${p}]`));

const testEnglish = "This is a verylongwordthatshouldnotbebroken.";
const pagesEng = splitPlainTextIntoPages(testEnglish, 15);
console.log("\nEnglish Pages (limit 15):");
pagesEng.forEach((p, i) => console.log(`Page ${i + 1}: [${p}]`));

const testMixed = "Hello প্র্যাকটিস World";
const pagesMixed = splitPlainTextIntoPages(testMixed, 10);
console.log("\nMixed Pages (limit 10):");
pagesMixed.forEach((p, i) => console.log(`Page ${i + 1}: [${p}]`));
