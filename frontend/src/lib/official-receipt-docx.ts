export interface OfficialReceiptData {
  referenceNumber: string;
  invoiceNumber: string;
  datePaid: string;
  paymentMethod: string;
  tenantName: string;
  roomNumber: string;
  billingMonth: string;
  status: string;
  rentAmount: number;
  waterAmount: number;
  electricityAmount: number;
  additionalCharges: { label: string; amount: number }[];
  totalStatementAmount: number;
  amountPaid: number;
}

const escapeXml = (str: string): string =>
  String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatPhpCurrency = (value: number): string =>
  `PHP ${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// Standard CRC-32 implementation for PKZIP container
const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const computeCrc32 = (bytes: Uint8Array): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = crc32Table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const createZipArchive = (
  files: { name: string; content: string }[],
): Blob => {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = encoder.encode(file.content);
    const crc = computeCrc32(dataBytes);
    const size = dataBytes.length;

    // Local File Header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // UTF-8 flag
    lv.setUint16(8, 0, true); // STORE (no compression)
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0x5421, true); // mod date
    lv.setUint32(14, crc, true); // crc32
    lv.setUint32(18, size, true); // compressed size
    lv.setUint32(22, size, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true); // filename len
    lv.setUint16(28, 0, true); // extra len
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    // Central Directory File Header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // signature
    cv.setUint16(4, 20, true); // version made by
    cv.setUint16(6, 20, true); // version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // STORE
    cv.setUint16(12, 0, true); // mod time
    cv.setUint16(14, 0x5421, true); // mod date
    cv.setUint32(16, crc, true); // crc32
    cv.setUint32(20, size, true); // compressed size
    cv.setUint32(24, size, true); // uncompressed size
    cv.setUint16(28, nameBytes.length, true); // filename len
    cv.setUint16(30, 0, true); // extra len
    cv.setUint16(32, 0, true); // comment len
    cv.setUint16(34, 0, true); // disk number
    cv.setUint16(36, 0, true); // internal attrs
    cv.setUint32(38, 0, true); // external attrs
    cv.setUint32(42, localOffset, true); // offset of local header
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    localOffset += localHeader.length + size;
  }

  const centralSize = centralParts.reduce((acc, p) => acc + p.length, 0);

  // End of Central Directory Record (22 bytes)
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // signature
  ev.setUint16(4, 0, true); // disk number
  ev.setUint16(6, 0, true); // central dir disk
  ev.setUint16(8, files.length, true); // entries on disk
  ev.setUint16(10, files.length, true); // total entries
  ev.setUint32(12, centralSize, true); // central dir size
  ev.setUint32(16, localOffset, true); // central dir offset
  ev.setUint16(20, 0, true); // comment length

  return new Blob([...localParts, ...centralParts, eocd] as BlobPart[], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
};

const buildTableRowXml = (
  leftText: string,
  rightText: string,
  options?: {
    bold?: boolean;
    shadingHex?: string;
    textColorHex?: string;
    fontSizeHalfPt?: number;
  },
): string => {
  const boldXml = options?.bold ? "<w:b/>" : "";
  const colorXml = options?.textColorHex
    ? `<w:color w:val="${options.textColorHex}"/>`
    : `<w:color w:val="1E293B"/>`;
  const sizeXml = `<w:sz w:val="${options?.fontSizeHalfPt || 21}"/><w:szCs w:val="${options?.fontSizeHalfPt || 21}"/>`;
  const shadingXml = options?.shadingHex
    ? `<w:shd w:val="clear" w:color="auto" w:fill="${options.shadingHex}"/>`
    : "";

  return `
    <w:tr>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="5400" w:type="dxa"/>
          ${shadingXml}
          <w:tcMar>
            <w:top w:w="120" w:type="dxa"/>
            <w:bottom w:w="120" w:type="dxa"/>
            <w:left w:w="180" w:type="dxa"/>
            <w:right w:w="180" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="left"/></w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              ${boldXml}
              ${colorXml}
              ${sizeXml}
            </w:rPr>
            <w:t>${escapeXml(leftText)}</w:t>
          </w:r>
        </w:p>
      </w:tc>
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="3600" w:type="dxa"/>
          ${shadingXml}
          <w:tcMar>
            <w:top w:w="120" w:type="dxa"/>
            <w:bottom w:w="120" w:type="dxa"/>
            <w:left w:w="180" w:type="dxa"/>
            <w:right w:w="180" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="right"/></w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Consolas" w:hAnsi="Consolas"/>
              ${boldXml || "<w:b/>"}
              ${colorXml}
              ${sizeXml}
            </w:rPr>
            <w:t>${escapeXml(rightText)}</w:t>
          </w:r>
        </w:p>
      </w:tc>
    </w:tr>
  `;
};

export const downloadOfficialReceiptDocx = (data: OfficialReceiptData): void => {
  const additionalRowsXml = (data.additionalCharges || [])
    .map((charge) =>
      buildTableRowXml(charge.label, formatPhpCurrency(charge.amount)),
    )
    .join("");

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:color w:val="0F172A"/>
          <w:sz w:val="36"/>
          <w:szCs w:val="36"/>
        </w:rPr>
        <w:t>RENTTRACK BOARDING HOUSE MANAGEMENT</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:after="240"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:color w:val="4F46E5"/>
          <w:sz w:val="24"/>
          <w:szCs w:val="24"/>
        </w:rPr>
        <w:t>OFFICIAL PAYMENT RECEIPT</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr><w:spacing w:before="120" w:after="120"/></w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:color w:val="334155"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>1. RECEIPT &amp; TENANT INFORMATION</w:t>
      </w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      ${buildTableRowXml("Official Receipt / Transaction No.", data.referenceNumber, { bold: true, shadingHex: "F8FAFC" })}
      ${buildTableRowXml("Invoice Number", data.invoiceNumber)}
      ${buildTableRowXml("Resident Name", data.tenantName)}
      ${buildTableRowXml("Assigned Room", data.roomNumber)}
      ${buildTableRowXml("Billing Statement Period", data.billingMonth)}
      ${buildTableRowXml("Date Paid", data.datePaid)}
      ${buildTableRowXml("Payment Method", data.paymentMethod)}
      ${buildTableRowXml("Payment Status", data.status.toUpperCase(), { bold: true, textColorHex: "0D9488", shadingHex: "F0FDFA" })}
    </w:tbl>

    <w:p>
      <w:pPr><w:spacing w:before="280" w:after="120"/></w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:color w:val="334155"/>
          <w:sz w:val="22"/>
        </w:rPr>
        <w:t>2. ITEMIZED BILLING &amp; PAYMENT BREAKDOWN</w:t>
      </w:r>
    </w:p>

    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
          <w:insideV w:val="none"/>
        </w:tblBorders>
      </w:tblPr>
      ${buildTableRowXml("CHARGE DESCRIPTION", "AMOUNT", { bold: true, shadingHex: "1E293B", textColorHex: "FFFFFF", fontSizeHalfPt: 20 })}
      ${buildTableRowXml("Room Rent", formatPhpCurrency(data.rentAmount))}
      ${buildTableRowXml("Water Bill", formatPhpCurrency(data.waterAmount))}
      ${buildTableRowXml("Electricity Bill", formatPhpCurrency(data.electricityAmount))}
      ${additionalRowsXml}
      ${buildTableRowXml("Total Statement Amount", formatPhpCurrency(data.totalStatementAmount), { bold: true, shadingHex: "F8FAFC" })}
      ${buildTableRowXml("TOTAL AMOUNT RECEIVED (PAID)", formatPhpCurrency(data.amountPaid), { bold: true, shadingHex: "EEF2FF", textColorHex: "3730A3", fontSizeHalfPt: 24 })}
    </w:tbl>


    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
        <w:spacing w:before="400" w:after="60"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:b/>
          <w:color w:val="475569"/>
          <w:sz w:val="19"/>
        </w:rPr>
        <w:t>This document serves as an Official Payment Receipt issued by RentTrack Boarding House Management.</w:t>
      </w:r>
    </w:p>

    <w:p>
      <w:pPr>
        <w:jc w:val="center"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
          <w:color w:val="94A3B8"/>
          <w:sz w:val="18"/>
        </w:rPr>
        <w:t>Generated on ${escapeXml(new Date().toLocaleString())}</w:t>
      </w:r>
    </w:p>

    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const blob = createZipArchive([
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: relsXml },
    { name: "word/document.xml", content: documentXml },
  ]);

  const safeRef = (data.referenceNumber || "Receipt").replace(
    /[^a-zA-Z0-9_-]/g,
    "_",
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `RentTrack_Official_Receipt_${safeRef}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
