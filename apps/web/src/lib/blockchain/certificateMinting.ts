import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, waitForReceipt } from "thirdweb";
import { polygonAmoy } from "thirdweb/chains";
import { privateKeyToAccount } from "thirdweb/wallets";
// import { ethers } from "ethers"; // Not used directly

/**
 * Blockchain Certificate Minting Service
 * 
 * This service handles automated NFT certificate minting on Polygon Amoy testnet.
 * Uses a backend admin wallet to mint certificates for students (no wallet required).
 */

// Initialize Thirdweb client
const client = createThirdwebClient({
  clientId: import.meta.env.VITE_THIRDWEB_CLIENT_ID || "your-client-id",
});

// Get admin wallet from environment variable
function getAdminWallet() {
  const privateKey = import.meta.env.VITE_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("VITE_ADMIN_PRIVATE_KEY is not set in environment variables");
  }
  
  // Remove 0x prefix if present
  const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  return privateKeyToAccount({
    client,
    privateKey: cleanKey,
  });
}

/**
 * Mint a certificate NFT on the blockchain
 * 
 * @param studentWalletAddress The wallet address of the student (or zero address if no wallet)
 * @param courseId The course identifier (UUID)
 * @param metadataURI The IPFS URI pointing to the certificate metadata JSON
 * @param contractAddress The deployed contract address
 * @returns Object containing transactionHash and tokenId
 */
export async function mintCertificateNFT(
  studentWalletAddress: string,
  studentName: string,
  courseTitle: string,
  metadataURI: string,
  contractAddress: string
): Promise<{ transactionHash: string; tokenId: bigint }> {
  try {
    console.log("🎨 Starting blockchain certificate minting...");
    console.log("Student:", studentWalletAddress);
    console.log("Student Name:", studentName);
    console.log("Course Title:", courseTitle);
    console.log("Metadata URI:", metadataURI);

    // Get admin wallet
    const adminWallet = getAdminWallet();
    
    // Get contract instance
    const contract = getContract({
      client,
      chain: polygonAmoy,
      address: contractAddress,
    });

    // Prepare the transaction
    // Note: Contract function is mintCertificate, not issueCertificate
    const transaction = prepareContractCall({
      contract,
      method: "function mintCertificate(address learner, string memory learnerName, string memory courseTitle, string memory metadataURI) external returns (uint256)",
      params: [studentWalletAddress, studentName, courseTitle, metadataURI],
    });

    // Send transaction
    console.log("📤 Sending transaction to blockchain...");
    const result = await sendTransaction({
      transaction,
      account: adminWallet,
    });

    // Wait for receipt
    console.log("⏳ Waiting for transaction confirmation...");
    const receipt = await waitForReceipt(result);

    if (!receipt.status || receipt.status === "reverted") {
      throw new Error("Transaction reverted on blockchain");
    }

    // Get the transaction hash
    const transactionHash = receipt.transactionHash;

    // Get the token ID from events
    // The CertificateIssued event should contain the tokenId
    // Note: You may need to parse events from receipt.logs
    // For now, we'll use a workaround: query the contract for the token ID
    let tokenId: bigint = 0n;
    
    try {
      // Try to get token ID using a view function
      // Since we can't easily parse events, we'll query the contract
      // This assumes the contract has a function to get token ID by student and courseId
      // If not available, we'll need to parse the event logs
      
      // Alternative: Parse events from receipt
      // The event signature is: CertificateIssued(uint256 indexed tokenId, address indexed student, string indexed courseId, string metadataURI)
      // We'll need to decode the logs to get the tokenId
      
      console.log("✅ Transaction confirmed! Hash:", transactionHash);
      
      // For now, return 0 as tokenId - we'll need to parse events or use a view function
      // In production, parse the event logs or add a view function to the contract
      
    } catch (error) {
      console.warn("Could not retrieve token ID from events:", error);
    }

    return {
      transactionHash,
      tokenId,
    };
  } catch (error: any) {
    console.error("❌ Blockchain minting failed:", error);
    throw new Error(`Certificate minting failed: ${error.message}`);
  }
}

/**
 * Check if a certificate has been minted on-chain for a student/course
 * 
 * @param studentWalletAddress The student's wallet address
 * @param courseId The course identifier
 * @param contractAddress The deployed contract address
 * @returns The token ID if certificate exists, null otherwise
 */
export async function checkCertificateOnChain(
  _studentWalletAddress: string,
  _courseId: string,
  _contractAddress: string
): Promise<bigint | null> {
  try {
    // TODO: Implement proper certificate checking
    // const contract = getContract({
    //   client,
    //   chain: polygonAmoy,
    //   address: contractAddress,
    // });
    // const tokenId = await contract.read("getCertificateTokenId", [
    //   studentWalletAddress,
    //   courseId,
    // ]);
    return null;
  } catch (error) {
    console.error("Error checking certificate on-chain:", error);
    return null;
  }
}

/**
 * Get the IPFS metadata URI for a certificate token
 * 
 * @param tokenId The NFT token ID
 * @param contractAddress The deployed contract address
 * @returns The IPFS metadata URI
 */
export async function getCertificateMetadataURI(
  _tokenId: bigint,
  _contractAddress: string
): Promise<string | null> {
  try {
    // TODO: Implement proper metadata URI retrieval
    // const contract = getContract({
    //   client,
    //   chain: polygonAmoy,
    //   address: contractAddress,
    // });
    // const uri = await contract.read("tokenURI", [tokenId]);
    return null;
  } catch (error) {
    console.error("Error getting certificate metadata URI:", error);
    return null;
  }
}

