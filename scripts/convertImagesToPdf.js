import { PDFDocument } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

async function convertImagesToPdf() {
  const pdfDoc = await PDFDocument.create()

  const assetsDir = path.join(process.cwd(), 'public', 'assets')
  const page1Path = path.join(assetsDir, 'page1.jpg')
  const page2Path = path.join(assetsDir, 'page2.jpg')

  const page1ImageBytes = fs.readFileSync(page1Path)
  const page2ImageBytes = fs.readFileSync(page2Path)

  const image1 = await pdfDoc.embedJpg(page1ImageBytes)
  const image2 = await pdfDoc.embedJpg(page2ImageBytes)

  // Standard A4 dimensions: 595.28 x 841.89 pt
  const a4Width = 595.28
  const a4Height = 841.89

  // Add Page 1
  const page1 = pdfDoc.addPage([a4Width, a4Height])
  page1.drawImage(image1, {
    x: 0,
    y: 0,
    width: a4Width,
    height: a4Height,
  })

  // Add Page 2
  const page2 = pdfDoc.addPage([a4Width, a4Height])
  page2.drawImage(image2, {
    x: 0,
    y: 0,
    width: a4Width,
    height: a4Height,
  })

  const pdfBytes = await pdfDoc.save()
  const outputPath = path.join(assetsDir, 'FEUILLE-DE-SOINS-MALADIE.pdf')
  fs.writeFileSync(outputPath, pdfBytes)

  console.log(`✓ FEUILLE-DE-SOINS-MALADIE.pdf successfully created from high-res image templates at: ${outputPath}`)
}

convertImagesToPdf().catch(console.error)
