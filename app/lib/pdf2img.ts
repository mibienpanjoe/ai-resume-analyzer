export interface PdfConversionResult {
    imageUrl: string;
    file: File | null;
    error?: string;
}

let pdfjsLib: any = null;
let isLoading = false;
let loadPromise: Promise<any> | null = null;

async function loadPdfJs(): Promise<any> {
    if (pdfjsLib) return pdfjsLib;
    if (loadPromise) return loadPromise;

    isLoading = true;
    // Dynamic import to ensure this only runs in the browser
    // @ts-expect-error - pdfjs-dist/build/pdf.mjs is not typed as an ES module here
    loadPromise = import("pdfjs-dist/build/pdf.mjs").then((lib) => {
        try {
            // Use a bundler-resolved URL for the worker so it works in dev and prod
            const workerUrl = new URL(
                "pdfjs-dist/build/pdf.worker.min.mjs",
                import.meta.url
            ).toString();
            lib.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch (err) {
            // Fallback to public path (in case bundler URL resolution fails)
            lib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
            // eslint-disable-next-line no-console
            console.warn("pdfjs workerSrc fell back to public path:", err);
        }
        pdfjsLib = lib;
        isLoading = false;
        return lib;
    });

    return loadPromise;
}

export async function convertPdfToImage(
    file: File
): Promise<PdfConversionResult> {
    try {
        const lib = await loadPdfJs();

        const arrayBuffer = await file.arrayBuffer();
        let pdf;
        try {
            pdf = await lib.getDocument({ data: arrayBuffer }).promise;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("PDF.js getDocument failed:", e);
            return {
                imageUrl: "",
                file: null,
                error: `Failed to open PDF. ${e instanceof Error ? e.message : e}`,
            };
        }

        let page;
        try {
            page = await pdf.getPage(1);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("PDF.js getPage failed:", e);
            return {
                imageUrl: "",
                file: null,
                error: `Failed to read first page of PDF. ${e instanceof Error ? e.message : e}`,
            };
        }

        const viewport = page.getViewport({ scale: 4 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (context) {
            context.imageSmoothingEnabled = true;
            context.imageSmoothingQuality = "high";
        }

        try {
            await page.render({ canvasContext: context!, viewport }).promise;
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error("PDF.js render failed:", e);
            return {
                imageUrl: "",
                file: null,
                error: `Failed to render PDF page. ${e instanceof Error ? e.message : e}`,
            };
        }

        return new Promise((resolve) => {
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        // Create a File from the blob with the same name as the pdf
                        const originalName = file.name.replace(/\.pdf$/i, "");
                        const imageFile = new File([blob], `${originalName}.png`, {
                            type: "image/png",
                        });

                        resolve({
                            imageUrl: URL.createObjectURL(blob),
                            file: imageFile,
                        });
                    } else {
                        resolve({
                            imageUrl: "",
                            file: null,
                            error: "Failed to create image blob",
                        });
                    }
                },
                "image/png",
                1.0
            ); // Set quality to maximum (1.0)
        });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error("convertPdfToImage error:", err);
        return {
            imageUrl: "",
            file: null,
            error: `Failed to convert PDF: ${err}`,
        };
    }
}