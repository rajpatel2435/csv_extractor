import Papa from 'papaparse';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';

export const config = {
  api: { bodyParser: false }, 
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  try {
  
    const form = formidable({
      keepExtensions: true, 
      maxFileSize: 5 * 1024 * 1024, 
      allowEmptyFiles: false,
    });

    const [, files] = await form.parse(req);

    const file = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;

    if (!file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const filePath = file.filepath; 
    if (!filePath) {
      return res.status(500).json({ success: false, error: 'Unable to get file path' });
    }

    const fileData = fs.readFileSync(filePath, 'utf8');

    try {
      const { data } = Papa.parse(fileData, { header: true, skipEmptyLines: true });

      if (!data) {
        throw new Error('Failed to parse CSV file');
      }

      const updatedData = (data as { Content: string }[]).map((row) => {
        const content = row?.Content || '';

        const xlMatch = content.match(/--image-background-xl: url\(\"(.*?)\"\)/);
        const mdMatch = content.match(/--image-background-md: url\(\"(.*?)\"\)/);
        const smMatch = content.match(/--image-background-sm: url\(\"(.*?)\"\)/);
        const modalContent = content.match(/<div class="modal-body">([\s\S]*?)<\/div>/);
        const promoMatch = content.match(/document\.cookie = 'promo=(.*?); expires=/);
        const title = content.match(/<title>(.*?)<\/title>/);
        const metaDescription = content.match(/<meta name="description" content="(.*?)"/);
        const hrefMatch = content.match(/<a\s+class=["']btn btn-main["']\s+href=["']([^"']+)["']/);
        const buttonTextMatch = content.match(/<a\s+class=["']btn btn-main["'][^>]*>\s*<span>(.*?)<\/span>\s*<\/a>/);

        const imgMatch = content.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*promo-text[^"']*["'][^>]*alt=["']([^"']+)["']/);

        return {
          ...row,
          image_background_xl: xlMatch ? xlMatch[1] : '',
          image_background_md: mdMatch ? mdMatch[1] : '',
          image_background_sm: smMatch ? smMatch[1] : '',
          modal_content: modalContent ? modalContent[0].replace(/\n/g, '') : '',
          promocode: promoMatch ? promoMatch[1] : '',
          PageTitle: title ? title[1] : '',
          metaDescription: metaDescription ? metaDescription[1] : '',
          promoImage: hrefMatch ? hrefMatch[1] : '',
          buttonText: buttonTextMatch ? buttonTextMatch[1] : '',
          imgSrc: imgMatch ? imgMatch[1] : '',
          imgAlt: imgMatch ? imgMatch[2] : '',
        };
      });

      // Convert updated data back to CSV format
      const csvData = Papa.unparse(updatedData);

      console.log(updatedData);
     
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="processed_data.csv"');

      return res.status(200).send(csvData);
    } catch (error) {
      console.error('Error processing file:', error);
      res.status(500).json({ success: false, error: 'Error processing file' });
    }
  } catch (error) {
    console.error('Error handling file upload:', error);
    res.status(500).json({ success: false, error: 'Error handling file upload' });
  }
}
