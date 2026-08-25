import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

async function inspectUserPdf() {
  const filePath = path.join(process.cwd(), 'public', 'assets', 'FEUILLE-DE-SOINS-MALADIE.pdf')
  const fileBytes = fs.readFileSync(filePath)
  const pdfDoc = await PDFDocument.load(fileBytes)

  const pages = pdfDoc.getPages()
  console.log(`PDF loaded. Total Pages: ${pages.length}`)

  pages.forEach((page, index) => {
    const { width, height } = page.getSize()
    const rotation = page.getRotation()
    console.log(`Page ${index + 1}: Width = ${width} pt, Height = ${height} pt, Rotation = ${rotation.angle} deg`)
  })
}

inspectUserPdf().catch(console.error)
