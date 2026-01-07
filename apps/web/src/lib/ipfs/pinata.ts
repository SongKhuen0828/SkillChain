/**
 * Pinata IPFS Upload Service
 * 
 * Handles uploading certificate images and metadata to IPFS via Pinata
 */

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

/**
 * Upload a file (image) to IPFS via Pinata
 * 
 * @param file The file to upload (File or Blob)
 * @param fileName The name for the file
 * @returns The IPFS hash (CID)
 */
export async function uploadImageToIPFS(
  file: File | Blob,
  fileName: string
): Promise<string> {
  const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
  const pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error("Pinata API keys are not configured. Please set VITE_PINATA_API_KEY and VITE_PINATA_SECRET_KEY");
  }

  try {
    const formData = new FormData();
    formData.append("file", file, fileName);

    // Optional: Pin to Pinata for permanent storage
    const pinataMetadata = JSON.stringify({
      name: fileName,
    });

    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    });

    formData.append("pinataMetadata", pinataMetadata);
    formData.append("pinataOptions", pinataOptions);

    const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata upload failed: ${error}`);
    }

    const data: PinataResponse = await response.json();
    return data.IpfsHash;
  } catch (error: any) {
    console.error("IPFS upload error:", error);
    throw new Error(`Failed to upload to IPFS: ${error.message}`);
  }
}

/**
 * Upload JSON metadata to IPFS via Pinata
 * 
 * @param metadata The metadata object to upload
 * @param fileName Optional file name
 * @returns The IPFS hash (CID)
 */
export async function uploadMetadataToIPFS(
  metadata: Record<string, any>,
  fileName: string = "metadata.json"
): Promise<string> {
  const pinataApiKey = import.meta.env.VITE_PINATA_API_KEY;
  const pinataSecretKey = import.meta.env.VITE_PINATA_SECRET_KEY;

  if (!pinataApiKey || !pinataSecretKey) {
    throw new Error("Pinata API keys are not configured");
  }

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        pinata_api_key: pinataApiKey,
        pinata_secret_api_key: pinataSecretKey,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: fileName,
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Pinata upload failed: ${error}`);
    }

    const data: PinataResponse = await response.json();
    return data.IpfsHash;
  } catch (error: any) {
    console.error("IPFS metadata upload error:", error);
    throw new Error(`Failed to upload metadata to IPFS: ${error.message}`);
  }
}

/**
 * Get IPFS URL from hash
 * 
 * @param hash The IPFS hash (CID)
 * @returns The IPFS gateway URL
 */
export function getIPFSUrl(hash: string): string {
  // Use a public IPFS gateway
  return `https://gateway.pinata.cloud/ipfs/${hash}`;
}

/**
 * Get IPFS URI format (for NFT metadata)
 * 
 * @param hash The IPFS hash (CID)
 * @returns The IPFS URI (ipfs://...)
 */
export function getIPFSUri(hash: string): string {
  return `ipfs://${hash}`;
}

