import { describe, expect, it } from "vitest";
import { parseEpubMetadata } from "../../src/shared/epub";
import { createStoredZip, JPEG_BYTES } from "../helpers/zip";

describe("EPUB metadata parser", () => {
  it("reads title, author and cover from OPF metadata", async () => {
    const zip = createStoredZip([
      {
        path: "META-INF/container.xml",
        data: `<?xml version="1.0"?>
          <container>
            <rootfiles>
              <rootfile full-path="OPS/package.opf" />
            </rootfiles>
          </container>`,
      },
      {
        path: "OPS/package.opf",
        data: `<?xml version="1.0"?>
          <package xmlns:dc="http://purl.org/dc/elements/1.1/">
            <metadata>
              <dc:title>Sea of Pages</dc:title>
              <dc:creator>Alice Chen</dc:creator>
              <meta name="cover" content="cover-image" />
            </metadata>
            <manifest>
              <item id="cover-image" href="images/cover.jpg" media-type="image/jpeg" />
            </manifest>
          </package>`,
      },
      {
        path: "OPS/images/cover.jpg",
        data: JPEG_BYTES,
      },
    ]);

    const metadata = await parseEpubMetadata(
      new File([zip], "sea.epub", { type: "application/epub+zip" }),
    );

    expect(metadata.title).toBe("Sea of Pages");
    expect(metadata.author).toBe("Alice Chen");
    expect(metadata.cover?.mimeType).toBe("image/jpeg");
    expect(metadata.cover?.suggestedFileName).toBe("sea-cover.jpg");
  });
});
