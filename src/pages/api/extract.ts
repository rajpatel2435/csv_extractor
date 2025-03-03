import Papa from 'papaparse';
import fs from 'fs';
import * as XLSX from 'xlsx';
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
    const form = formidable({ keepExtensions: true, multiples: true });
   // @ts-check avoid type errors
    const files = await new Promise<{ [key: string]: formidable.File[] }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve(files as { [key: string]: formidable.File[] }); 
        
      });
    });

    if (!files.file || files.file.length < 2) {
      return res.status(400).json({ success: false, error: 'Two files are required' });
    }

    const [firstFile, secondFile] = files.file;

    // Function to parse CSV or Excel files
    const parseFile = (file: formidable.File) => {
      const fileData = fs.readFileSync(file.filepath);
      const fileExt = file.originalFilename?.split('.').pop()?.toLowerCase();

      if (fileExt === 'csv') {
        const { data } = Papa.parse(fileData.toString(), { header: true, skipEmptyLines: true });
        return data;
      } else if (fileExt === 'xls' || fileExt === 'xlsx') {
        const workbook = XLSX.read(fileData, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      } else {
        throw new Error(`Unsupported file type: ${fileExt}`);
      }
    };

    // Parse both files
    const firstData = parseFile(firstFile) as Record<string, string>[];
    const secondData  = parseFile(secondFile) as Record<string, string>[];
    // console.log(firstData);

    // Extract StaticContentID where "Keep/Delete" is "Keep - New"
    const validIDs = new Set < string | string > (
      firstData
        .filter((row : Record<string, string>) => row["Keep / Delete"] === "Keep - New")
        .map((row : Record<string, string>) => row["StaticContentID"])
    );

    // Filter the second file based on matching StaticContentID
    const updatedData = secondData
      .filter((row: Record<string, string>) =>
// @ts-expect-error avoid issue here
        validIDs.has(Number(row["StaticContentID"])))
      .map((row: Record<string, string>) => {

        const content = row?.Content || '';

        return {
          page_title: row["PageTitle"],
          StaticContentID: row["StaticContentID"],
          image_background_xl: content.match(/--image-background-xl: url\(\"(.*?)\"\)/)?.[1] || '',
          image_background_md: content.match(/--image-background-md: url\(\"(.*?)\"\)/)?.[1] || '',
          image_background_sm: content.match(/--image-background-sm: url\(\"(.*?)\"\)/)?.[1] || '',
          modal_content: content.match(/<div class="modal-body">([\s\S]*?)<\/div>/)?.[0]?.replace(/\n/g, '') || '',
          promocode: content.match(/document\.cookie = 'promo=(.*?); expires=/)?.[1] || '',
          PageTitle: content.match(/<title>(.*?)<\/title>/)?.[1] || '',
          metaDescription: content.match(/<meta name="description" content="(.*?)"/)?.[1] || '',
          buttonLink: content.match(/<a\s+class=["']btn btn-main["']\s+href=["']([^"']+)["']/)?.[1] || '',
          buttonText: content.match(/<a\s+class=["']btn btn-main["'][^>]*>\s*<span>(.*?)<\/span>\s*<\/a>/)?.[1] || '',
          imgSrc: content.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*promo-text[^"']*["'][^>]*alt=["']([^"']+)["']/)?.[1] || '',
          imgAlt: content.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*promo-text[^"']*["'][^>]*alt=["']([^"']+)["']/)?.[2] || '',
        };
      });


    // Convert updated data to CSV format
    const csvData = Papa.unparse(updatedData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="filtered_data.csv"');

    return res.status(200).send(csvData);
  } catch (error) {
    console.error('Error handling file upload:', error);
    return res.status(500).json({ success: false, error: 'Error handling file upload' });
  }
}
