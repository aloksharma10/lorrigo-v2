import Handlebars from 'handlebars';
import { PDFDocument } from 'pdf-lib';
import puppeteer from 'puppeteer';
import bwipjs from 'bwip-js';
import fs from 'fs/promises';
import path from 'path';

export interface LabelManifestUserConfig {
  label_format: 'A4' | 'THERMAL';
  manifest_format: 'A4' | 'THERMAL';
}

export interface ShipmentLabelData {
  awb: string;
  orderReferenceId: string;
  customerName: string;
  customerAddress: string;
  customerPincode: string;
  customerPhone: string;
  orderBoxLength: number;
  orderBoxWidth: number;
  orderBoxHeight: number;
  orderWeight: number;
  orderWeightUnit: string;
  paymentMode: string;
  isCOD: boolean;
  amountToCollect: number;
  carrierName: string;
  routingCode?: string;
  sellerName: string;
  sellerAddress: string;
  rtoAddress: string;
  rtoCity: string;
  rtoState: string;
  companyLogoUrl: string;
  lorrigoLogoUrl: string;
  productName: string;
  invoiceNumber: string;
  sellerGSTIN?: string;
}

export interface ManifestOrderData {
  awb: string;
  order_reference_id: string;
  productName: string;
  barcodeUrl: string;
  companyLogoUrl: string;
}

// Utility: Load Handlebars template from file
async function loadTemplate(templatePath: string): Promise<Handlebars.TemplateDelegate> {
  const content = await fs.readFile(templatePath, 'utf8');
  return Handlebars.compile(content);
}

// Utility: Generate barcode as PNG data URI using bwip-js (async)
async function generateBarcodeDataUrl(value: string): Promise<string> {
  try {
    const pngBuffer = await bwipjs.toBuffer({
      bcid: 'code128',
      text: value || 'NOAWB',
      width: 30,
      scale: 3,
      height: 10,
      includetext: false,
      backgroundcolor: 'FFFFFF',
    });
    return `data:image/png;base64,${pngBuffer.toString('base64')}`;
  } catch (err) {
    // Fallback: transparent PNG
    return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAn8B9pQn2wAAAABJRU5ErkJggg==';
  }
}

// Utility: Get template path
function getTemplatePath(type: 'label' | 'manifest', format: 'A4' | 'THERMAL'): string {
  const projectRoot = path.resolve(process.cwd());
  if (type === 'label') {
    return format === 'THERMAL'
      ? path.join(projectRoot, 'src/template/thermal-invoice-template.html')
      : path.join(projectRoot, 'src/template/a4-labels-template.html');
  } else {
    return path.join(projectRoot, 'src/template/manifest-template.html');
  }
}

// Main: Generate bulk labels (A4 or Thermal)
export async function generateBulkLabels(params: { shipments: ShipmentLabelData[]; format: 'A4' | 'THERMAL' }): Promise<Buffer> {
  const { shipments, format } = params;
  if (!shipments.length) throw new Error('No shipments provided');
  const templatePath = getTemplatePath('label', format);
  const template = await loadTemplate(templatePath);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const mergedPdf = await PDFDocument.create();
  try {
    if (format === 'THERMAL') {
      // Thermal: one label per page
      for (const shipment of shipments) {
        const barcodeUrl = await generateBarcodeDataUrl(shipment.awb);
        const data = { ...shipment, barcodeUrl };
        const html = template(data);
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
          width: '101.6mm',
          height: '152.4mm',
          printBackground: true,
          margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
        });
        const singlePdf = await PDFDocument.load(pdf);
        const copiedPages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
        await page.close();
      }
    } else {
      // A4: 2 columns x 3 rows = 6 labels per page
      const chunkSize = 6;
      for (let i = 0; i < shipments.length; i += chunkSize) {
        const chunk = shipments.slice(i, i + chunkSize);
        const enriched = await Promise.all(
          chunk.map(async (s) => ({ ...s, barcodeUrl: await generateBarcodeDataUrl(s.awb) }))
        );
        const html = template({ shipments: enriched });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
        });
        const singlePdf = await PDFDocument.load(pdf);
        const copiedPages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());
        copiedPages.forEach((p) => mergedPdf.addPage(p));
        await page.close();
      }
    }
    const pdfBytes = await mergedPdf.save();
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}

// Main: Generate bulk manifests (A4 or Thermal)
export async function generateBulkManifests(params: {
  orders: ManifestOrderData[];
  format: 'A4' | 'THERMAL';
  sellerName: string;
  courierName: string;
}): Promise<Buffer> {
  const { orders, format, sellerName, courierName } = params;
  if (!orders.length) throw new Error('No orders provided');
  const templatePath = getTemplatePath('manifest', format);
  const template = await loadTemplate(templatePath);
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const mergedPdf = await PDFDocument.create();
  try {
    // For manifests, just one manifest for all orders
    const manifestOrders = await Promise.all(
      orders.map(async (order, idx) => ({
        ...order,
        barcodeUrl: await generateBarcodeDataUrl(order.awb),
        index: idx + 1,
      }))
    );
    const data = {
      generatedDate: new Date().toLocaleString(),
      sellerName,
      courierName,
      manifestId: `MANIFEST-${Date.now()}`,
      totalOrders: manifestOrders.length,
      orders: manifestOrders,
      lorrigoLogoUrl: 'https://lorrigo.in/_next/static/media/lorrigologo.e54a51f3.svg',
    };
    const html = template(data);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfOptions =
      format === 'THERMAL'
        ? { width: '101.6mm', height: '152.4mm', printBackground: true, margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' } }
        : { format: 'A4' as const, printBackground: true, margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' } };
    const pdf = await page.pdf(pdfOptions);
    const singlePdf = await PDFDocument.load(pdf);
    const copiedPages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
    await page.close();
    const pdfBytes = await mergedPdf.save();
    return Buffer.from(pdfBytes);
  } finally {
    await browser.close();
  }
}
