import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import * as formidable from "formidable";
import { tmpdir } from "os";

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  try {
    const tmpDir = tmpdir();
    const file = await new Promise<formidable.File | null>((resolve, reject) => {
      const form = new formidable.IncomingForm();
      // @ts-expect-error need to avoid error
      form.uploadDir = tmpDir;
      //@ts-expect-error need to avoid the error
      form.keepExtensions = true;

      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("Error parsing file upload:", err);
          reject(err);
        } else {
          const uploadedFile = files.file ? (Array.isArray(files.file) ? files.file[0] : files.file) : null;
          console.log("Uploaded file:", uploadedFile);
          resolve(uploadedFile as formidable.File);
        }
      });
    });

    if (!file) {
      console.error("No file uploaded");
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }

    const filePath = file.filepath;
    if (!filePath) {
      console.error("Unable to get file path");
      return res.status(500).json({ success: false, error: "Unable to get file path" });
    }


    const fileData = fs.readFileSync(filePath, "utf8");


    try {
      const { data } = Papa.parse(fileData, { header: true, skipEmptyLines: true });

      const updatedData = (data as Record<string, string>[]).map((row) => {
        const content = row.Content || "";

        // xl bg image
        const xlMatch = content.match(/--image-background-xl: url\(\"(.*?)\"\)/);
        // md bg image
        const mdMatch = content.match(/--image-background-md: url\(\"(.*?)\"\)/);
        // sm bg image
        const smMatch = content.match(/--image-background-sm: url\(\"(.*?)\"\)/);

        // modal content
        const modalContent = content.match(/<div class="modal-body">([\s\S]*?)<\/div>/);

        // fetch promo code
        const promoMatch = content.match(/document\.cookie = 'promo=(.*?); expires=/);

        // fetch title
        const title = content.match(/<title>(.*?)<\/title>/);
        // fetch meta description
        const metaDescription = content.match(/<meta name="description" content="(.*?)"/);

        return {
          ...row,
          image_background_xl: xlMatch ? xlMatch[1] : "",
          image_background_md: mdMatch ? mdMatch[1] : "",
          image_background_sm: smMatch ? smMatch[1] : "",
          modal_content: modalContent ? modalContent[0].replace(/\n/g, "") : "",
          promo_code: promoMatch ? promoMatch[1] : "",
          PageTitle: title ? title[1] : "",
          metaDescription: metaDescription ? metaDescription[1] : "",
        };
      });



      const outputPath = path.join(tmpDir, "processed.csv");

      fs.writeFileSync(outputPath, Papa.unparse(updatedData));


      res.status(200).json({ success: true, message: "File processed successfully!", fileUrl: "/processed.csv" });
    } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ success: false, error: "Error processing file" });
    }
  } catch (error) {
    console.error("Error handling file upload:", error);
    res.status(500).json({ success: false, error: "Error handling file upload" });
  }
}