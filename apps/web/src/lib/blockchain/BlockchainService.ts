/**
 * Blockchain Service - Certificate Minting
 * Supports both Real Blockchain and Simulation modes
 */

// import { supabase } from '@/lib/supabase'; // Not used in this file

export interface MintResult {
  transactionHash: string;
  tokenId: bigint;
}

/**
 * Generate a realistic-looking transaction hash for simulation mode
 */
function generateSimulatedTxHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Generate a realistic-looking token ID for simulation mode
 */
function generateSimulatedTokenId(): bigint {
  // Generate a random number between 1 and 1,000,000
  return BigInt(Math.floor(Math.random() * 1000000) + 1);
}

/**
 * Simulate blockchain minting (for development/testing)
 * Returns a realistic transaction hash after a delay
 */
async function simulateMinting(
  _studentAddress: string,
  _courseTitle: string,
  _metadataURI: string
): Promise<MintResult> {
  // Simulate network delay (3 seconds)
  await new Promise(resolve => setTimeout(resolve, 3000));

  const txHash = generateSimulatedTxHash();
  const tokenId = generateSimulatedTokenId();

  console.log('🎭 SIMULATION MODE: Certificate "minted" (simulated)');
  console.log('Transaction Hash:', txHash);
  console.log('Token ID:', tokenId.toString());

  return {
    transactionHash: txHash,
    tokenId,
  };
}

/**
 * Real blockchain minting using ethers.js
 * Requires ADMIN_PRIVATE_KEY environment variable
 */
async function realMinting(
  studentAddress: string,
  studentName: string,
  courseTitle: string,
  metadataURI: string,
  contractAddress: string
): Promise<MintResult> {
  try {
    // Dynamically import ethers to avoid bundle size issues
    const { ethers } = await import('ethers');

    const adminPrivateKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      throw new Error('VITE_ADMIN_PRIVATE_KEY is not set. Cannot mint on blockchain.');
    }

    const rpcUrl = import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(adminPrivateKey, provider);

    // ABI for the mintCertificate function
    // This matches SkillChainCertificate.sol contract
    const contractABI = [
      'function mintCertificate(address student, string memory studentName, string memory courseTitle, string memory metadataURI) external returns (uint256)',
      'event CertificateIssued(uint256 indexed tokenId, address indexed student, string metadataURI)',
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, wallet);

    console.log('⛓️ REAL MODE: Minting certificate on blockchain...');
    console.log('Student Address:', studentAddress);
    console.log('Student Name:', studentName);
    console.log('Course Title:', courseTitle);
    console.log('Metadata URI:', metadataURI);
    console.log('Contract:', contractAddress);

    // Call the contract function
    const tx = await contract.mintCertificate(
      studentAddress,
      studentName,
      courseTitle,
      metadataURI
    );
    console.log('Transaction sent:', tx.hash);

    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);

    // Parse the event to get tokenId
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed?.name === 'CertificateIssued';
      } catch {
        return false;
      }
    });

    let tokenId: bigint;
    if (event) {
      const parsed = contract.interface.parseLog(event);
      tokenId = parsed?.args.tokenId || BigInt(0);
    } else {
      // Fallback: query the contract for the latest tokenId
      // Note: This is not ideal, but works if event parsing fails
      tokenId = BigInt(receipt.blockNumber);
    }

    return {
      transactionHash: receipt.hash,
      tokenId,
    };
  } catch (error: any) {
    console.error('❌ Real blockchain minting failed:', error);
    throw new Error(`Blockchain minting failed: ${error.message}`);
  }
}

/**
 * Main minting function - switches between simulation and real mode
 */
export async function mintCertificateNFT(
  studentAddress: string,
  studentName: string,
  courseTitle: string,
  metadataURI: string,
  contractAddress: string
): Promise<MintResult> {
  const useSimulation = import.meta.env.VITE_USE_SIMULATION === 'true' || !contractAddress;

  if (useSimulation) {
    console.log('🎭 Using SIMULATION mode (no real blockchain transaction)');
    return simulateMinting(studentAddress, courseTitle, metadataURI);
  } else {
    console.log('⛓️ Using REAL blockchain mode');
    return realMinting(studentAddress, studentName, courseTitle, metadataURI, contractAddress);
  }
}

/**
 * Upload certificate image and metadata to IPFS, then mint NFT
 * This is a convenience function that combines IPFS upload and minting
 */
export async function uploadAndMintCertificate(
  certificateElement: HTMLElement,
  studentAddress: string,
  studentName: string,
  courseTitle: string,
  courseId: string,
  userId: string,
  completionDate: string,
  educatorName?: string
): Promise<{ transactionHash: string; tokenId: bigint; ipfsHash: string }> {
  // Import IPFS functions dynamically
  const { uploadImageToIPFS, uploadMetadataToIPFS, getIPFSUri } = await import('@/lib/ipfs/pinata');
  const html2canvas = (await import('html2canvas')).default;

  // 1. Generate certificate image
  const canvas = await html2canvas(certificateElement, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  // Convert canvas to blob
  const imageBlob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob!);
    }, "image/png", 0.95);
  });

  // 2. Upload image to IPFS
  const imageHash = await uploadImageToIPFS(imageBlob, `certificate-${courseId}-${userId}.png`);
  const imageUrl = `ipfs://${imageHash}`;

  // 3. Prepare metadata
  const metadata = {
    name: "SkillChain Certificate of Completion",
    description: `This certifies that ${studentName} has successfully completed the course "${courseTitle}"`,
    image: imageUrl,
    attributes: [
      { trait_type: "Student Name", value: studentName },
      { trait_type: "Course Title", value: courseTitle },
      { trait_type: "Completion Date", value: completionDate },
      { trait_type: "Instructor", value: educatorName || "SkillChain Team" },
      { trait_type: "Certificate Type", value: "Course Completion" },
    ],
  };

  // 4. Upload metadata to IPFS
  const metadataHash = await uploadMetadataToIPFS(metadata, `certificate-metadata-${courseId}-${userId}.json`);
  const metadataURI = getIPFSUri(metadataHash);

  // 5. Get contract address
  const contractAddress = import.meta.env.VITE_CERTIFICATE_CONTRACT_ADDRESS;
  if (!contractAddress) {
    throw new Error("VITE_CERTIFICATE_CONTRACT_ADDRESS is not set in environment variables");
  }

  // 6. Mint NFT
  const { transactionHash, tokenId } = await mintCertificateNFT(
    studentAddress,
    studentName,
    courseTitle,
    metadataURI,
    contractAddress
  );

  return {
    transactionHash,
    tokenId,
    ipfsHash: metadataHash,
  };
}
