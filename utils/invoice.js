import fs from 'fs';
import PDFDocument from 'pdfkit';


async function createInvoice(invoice, req, res, next) {

  let doc = new PDFDocument({ size: "A4", margin: 50 });


  // Set the PDF response headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=Invoice.pdf');


  doc.pipe(res);

  generateHeader(doc);
  generateCustomerInformation(doc, invoice);
  generateInvoiceTable(doc, invoice);
  generateFooter(doc);

  doc.end();

}



function generateHeader(doc) {
  doc
    .image("public/logo.png", 50, 45, { width: 50 })
    .fillColor("#444444")
    .fontSize(20)
    .text("ARTISTRY Inc.", 110, 57)
    
    .fontSize(10)
    .text("ARTISRTY Inc.", 200, 50, { align: "right" })
    .text("Abcd street", 200, 65, { align: "right" })
    .text("Calicut, Kerala, 673020", 200, 80, { align: "right" })
    .moveDown();
}



function generateCustomerInformation(doc, invoice) {
  doc
    .fillColor("#444444")
    .fontSize(20)
    .text("Invoice", 50, 160);

  generateHr(doc, 185);

  const customerInformationTop = 200;

  doc
    .fontSize(10)
    .text("Invoice Number:", 50, customerInformationTop)
    .font("Helvetica-Bold")
    .text(invoice.invoice_nr, 150, customerInformationTop)
    .font("Helvetica")
    .text("Invoice Date:", 50, customerInformationTop + 15)
    .text(formatDate(new Date()), 150, customerInformationTop + 15)
    .text("Order Date:", 50, customerInformationTop + 30)
    .text(formatDate(new Date(invoice.orderdate)), 150, customerInformationTop + 30)

    .font("Helvetica-Bold")
    .text(invoice.shipping.name, 300, customerInformationTop)
    .font("Helvetica")
    .text(invoice.shipping.address, 300, customerInformationTop + 15)
    .text(invoice.shipping.city + ", " + 
          invoice.shipping.state + ", " + 
          invoice.shipping.postal_code, 
          300, 
          customerInformationTop + 30)
    .text(invoice.shipping.phone, 300, customerInformationTop + 45)
    .moveDown();

  generateHr(doc, 260);
  
}



function generateInvoiceTable(doc, invoice) {
  let i;

  const invoiceTableTop = 350;

  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    invoiceTableTop,
    "Item",
    "Description",
    "Price",
    "Quantity",
    "Total"
  );

  generateHr(doc, invoiceTableTop + 20);
  
  doc.font("Helvetica");
  for (i = 0; i < invoice.items.length; i++) {
    const item = invoice.items[i];
    const position = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
      doc,
      position,
      item.product.title,
      `${item.product.description.substring(0, 25)}..`,
      formatCurrency(item.product.price),
      item.quantity,
      formatCurrency(item.product.price * item.quantity)
    );

    generateHr(doc, position + 20);
  }

  const subtotalPosition = invoiceTableTop + (i + 1) * 30;

  generateTableRow(
    doc,
    subtotalPosition,
    "",
    "",
    "Subtotal",
    "",
    formatCurrency(invoice.subtotal)
  );

  const paidToDatePosition = subtotalPosition + 20;
  generateTableRow(
    doc,
    paidToDatePosition,
    "",
    "",
    "Shipping",
    "",
    formatCurrency(invoice.shippingcharge)
  );

  const duePosition = paidToDatePosition + 25;
  doc.font("Helvetica-Bold");
  generateTableRow(
    doc,
    duePosition,
    "",
    "",
    "Grandtotal",
    "",
    formatCurrency(invoice.grandtotal)
  );
  doc.font("Helvetica");
}

function generateFooter(doc) {
  doc
    .fontSize(10)
    .text(
      "Thank you for your purchase .",
      50,
      780,
      { align: "center", width: 500 }
    );
}



//custom functions
function generateTableRow(
  doc,
  y,
  item,
  description,
  unitCost,
  quantity,
  lineTotal
) {
  doc
    .fontSize(10)
    .text(item, 50, y)
    .text(description, 180, y)
    .text(unitCost, 280, y, { width: 90, align: "right" })
    .text(quantity, 370, y, { width: 90, align: "right" })
    .text(lineTotal, 0, y, { align: "right" });
}


function generateHr(doc, y) {
  doc
    .strokeColor("#aaaaaa")
    .lineWidth(1)
    .moveTo(50, y)
    .lineTo(550, y)
    .stroke();
}

function formatCurrency(cents) {
  return (cents).toFixed(2);  
}

function formatDate(date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  return day + "/" + month + "/" + year;
}

export default createInvoice;