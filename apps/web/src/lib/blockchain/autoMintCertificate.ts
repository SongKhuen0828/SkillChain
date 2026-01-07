import { supabase } from "@/lib/supabase";
import { checkCourseCompletion, cleanupCertificateElement } from "@/lib/certificate";
import { uploadImageToIPFS, uploadMetadataToIPFS, getIPFSUri } from "@/lib/ipfs/pinata";
import html2canvas from "html2canvas";
// import jsPDF from "jspdf"; // Not used

/**
 * Automatically mint a certificate NFT when a course is completed
 * 
 * This function:
 * 1. Checks if course is completed (all lessons + quiz thresholds met)
 * 2. Generates certificate image using html2canvas
 * 3. Uploads image and metadata to IPFS
 * 4. Mints NFT on blockchain
 * 5. Saves transaction details to database
 * 
 * @param userId The user ID
 * @param courseId The course ID
 * @param studentName The student's name
 * @param courseTitle The course title
 * @param certificateElement The DOM element containing the certificate (for rendering)
 * @returns Object with transactionHash and tokenId, or null if not completed
 */
export async function autoMintCertificate(
  userId: string,
  courseId: string,
  studentName: string,
  courseTitle: string,
  certificateElement: HTMLElement,
  educatorName?: string,
  completionDate?: string
): Promise<{ transactionHash: string; tokenId: bigint; ipfsHash: string } | null> {
  try {
    console.log("🎓 Starting automated certificate minting process...");

    // 1. Check if course is actually completed
    const completionStatus = await checkCourseCompletion(userId, courseId);
    
    if (!completionStatus.isCompleted) {
      console.log("⏸️  Course not completed yet. Cannot mint certificate.");
      return null;
    }

    // Check if certificate already exists in database
    const { data: existingCert } = await supabase
      .from("certificates")
      .select("id, tx_hash")
      .eq("user_id", userId)
      .eq("course_id", courseId)
      .maybeSingle();

    if (existingCert?.tx_hash) {
      console.log("✅ Certificate already minted. Transaction:", existingCert.tx_hash);
      return {
        transactionHash: existingCert.tx_hash,
        tokenId: BigInt(0), // token_id column doesn't exist in schema
        ipfsHash: "", // Already minted
      };
    }

    // 2. Generate certificate image
    console.log("🖼️  Generating certificate image...");
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

    // 3. Upload image to IPFS
    console.log("☁️  Uploading certificate image to IPFS...");
    const imageHash = await uploadImageToIPFS(imageBlob, `certificate-${courseId}-${userId}.png`);
    const imageUrl = `ipfs://${imageHash}`;

    // 4. Prepare metadata
    const completionDateStr = completionDate || new Date().toISOString().split("T")[0];
    const metadata = {
      name: "SkillChain Certificate of Completion",
      description: `This certifies that ${studentName} has successfully completed the course "${courseTitle}"`,
      image: imageUrl,
      attributes: [
        {
          trait_type: "Student Name",
          value: studentName,
        },
        {
          trait_type: "Course Title",
          value: courseTitle,
        },
        {
          trait_type: "Completion Date",
          value: completionDateStr,
        },
        {
          trait_type: "Instructor",
          value: educatorName || "SkillChain Team",
        },
        {
          trait_type: "Certificate Type",
          value: "Course Completion",
        },
      ],
    };

    // 5. Upload metadata to IPFS
    console.log("📄 Uploading metadata to IPFS...");
    const metadataHash = await uploadMetadataToIPFS(metadata, `certificate-metadata-${courseId}-${userId}.json`);
    const metadataURI = getIPFSUri(metadataHash);

    // 6. Get student wallet address (if available) or use zero address
    // For now, we'll use zero address since students don't need wallets
    // In the future, you can link student wallets to their profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_address")
      .eq("id", userId)
      .single();

    const studentWalletAddress = profile?.wallet_address || "0x0000000000000000000000000000000000000000";

    // 7. Get contract address from environment
    const contractAddress = import.meta.env.VITE_CERTIFICATE_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error("VITE_CERTIFICATE_CONTRACT_ADDRESS is not set in environment variables");
    }

    // 8. Mint NFT on blockchain (real or simulation)
    console.log("⛓️  Minting certificate NFT on blockchain...");
    const { mintCertificateNFT } = await import('./BlockchainService');
    const { transactionHash, tokenId } = await mintCertificateNFT(
      studentWalletAddress,
      studentName,
      courseTitle,
      metadataURI,
      contractAddress
    );

    console.log("✅ Certificate NFT minted successfully!");
    console.log("Transaction Hash:", transactionHash);
    console.log("Token ID:", tokenId.toString());

    // 9. Save to database (token_id not in schema, store in tx_hash comment or skip)
    const { error: dbError } = await supabase.from("certificates").insert({
      user_id: userId,
      course_id: courseId,
      tx_hash: transactionHash,
      ipfs_hash: metadataHash,
      minted_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("⚠️  Failed to save certificate to database:", dbError);
      // Don't throw - the NFT is already minted
    }

      // Clean up certificate element
      cleanupCertificateElement(certificateElement);

      return {
        transactionHash,
        tokenId,
        ipfsHash: metadataHash,
      };
    } catch (error: any) {
      console.error("❌ Automated certificate minting failed:", error);
      
      // Clean up certificate element even on error
      cleanupCertificateElement(certificateElement);
      
      throw error;
    }
  }

