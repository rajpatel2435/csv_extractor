import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import * as formidable from "formidable";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const file = await new Promise<formidable.File | null>((resolve, reject) => {
      const form = new formidable.IncomingForm();
      form.uploadDir = path.join(process.cwd(), "public");
      form.keepExtensions = true;

      form.parse(req, (err, fields, files) => {
        if (err) {
          reject(err);
        } else {
          const uploadedFile = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;
          resolve(uploadedFile as formidable.File);
        }
      });
    });

    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const filePath = file.filepath;
    if (!filePath) {
      return res.status(500).json({ success: false, error: "Unable to get file path" });
    }

    const fileData = fs.readFileSync(filePath, "utf8");
    const { data } = Papa.parse(fileData, { header: true, skipEmptyLines: true });

    const updatedData = data.map((row: Record<string, string>) => {
      const content = row.Content || "";



      const xlMatch = content.match(/--image-background-xl: url\(\"(.*?)\"\)/);

      const mdMatch = content.match(/--image-background-md: url\(\"(.*?)\"\)/);

      const smMatch = content.match(/--image-background-sm: url\(\"(.*?)\"\)/);


      const modalContent = content.match(/<div class="modal-body">([\s\S]*?)<\/div>/);



      const promoMatch = content.match(/document\.cookie = 'promo=(.*?); expires=/);
      // console.log(modalMatch);

      const title = content.match(/<title>(.*?)<\/title>/s);

      const bodyTag = content.match(/<body[\s\S]*?<\/body>/s);

      if (modalContent) {
        console.log("getiing content")
        console.log(modalContent[0]);
      }

      const metaDescription = content.match(/<meta name="description" content="(.*?)"/s);

      return {
        ...row,
        image_background_xl: xlMatch ? xlMatch[1] : "",
        image_background_md: mdMatch ? mdMatch[1] : "",
        image_background_sm: smMatch ? smMatch[1] : "",
        modal_content: modalContent ? modalContent[0] : "",
        promo_code: promoMatch ? promoMatch[1] : "",
        PageTitle: title ? title[1] : "",
        metaDescription: metaDescription ? metaDescription[1] : "",
      };
    });

    const outputPath = path.join(process.cwd(), "public", "processed.csv");
    fs.writeFileSync(outputPath, Papa.unparse(updatedData));

    res.status(200).json({ success: true, message: "File processed successfully!", fileUrl: "/processed.csv" });
  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ success: false, error: "Error processing file" });
  }
}
