import { ethers } from "hardhat";

/**
 * Deployment script for SkillChainCertificate contract
 * 
 * Usage:
 *   npx hardhat run scripts/deploy-certificate.ts --network polygon-amoy
 * 
 * Environment Variables Required:
 *   PRIVATE_KEY: Your deployer wallet private key
 *   POLYGON_AMOY_RPC_URL: Polygon Amoy testnet RPC endpoint
 */

async function main() {
  console.log("🚀 Deploying SkillChainCertificate contract...\n");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  
  // Check balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "MATIC\n");

  if (balance === 0n) {
    throw new Error("❌ Insufficient balance. Please fund your account with testnet MATIC.");
  }

  // Deploy the contract
  console.log("📦 Deploying SkillChainCertificate...");
  const CertificateContract = await ethers.getContractFactory("SkillChainCertificate");
  
  // The deployer will be the initial owner
  const certificate = await CertificateContract.deploy(deployer.address);
  
  await certificate.waitForDeployment();
  const contractAddress = await certificate.getAddress();

  // Detect network
  const network = await ethers.provider.getNetwork();
  const chainId = Number(network.chainId);
  const networkName = chainId === 137 ? "Polygon Mainnet" : chainId === 80002 ? "Polygon Amoy Testnet" : `Chain ${chainId}`;
  const explorerUrl = chainId === 137 
    ? `https://polygonscan.com/address/${contractAddress}` 
    : `https://amoy.polygonscan.com/address/${contractAddress}`;

  console.log("\n✅ Contract deployed successfully!");
  console.log("📍 Contract Address:", contractAddress);
  console.log("👤 Owner Address:", deployer.address);
  console.log("\n📋 Contract Details:");
  console.log(`   Network: ${networkName}`);
  console.log("   Name: SkillChain Certificate");
  console.log("   Symbol: SKILLCERT");
  console.log("\n🔗 View on Polygonscan:");
  console.log(`   ${explorerUrl}\n`);

  // Verify deployment by calling a view function
  try {
    const totalCertificates = await certificate.totalCertificates();
    console.log("✅ Verification: Total certificates issued =", totalCertificates.toString());
  } catch (error) {
    console.log("⚠️  Could not verify deployment:", error);
  }

  // Save deployment info
  const deploymentInfo = {
    network: networkName,
    chainId: chainId,
    contractAddress: contractAddress,
    owner: deployer.address,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    transactionHash: certificate.deploymentTransaction()?.hash,
  };

  console.log("\n📄 Deployment Information:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  // Instructions for next steps
  console.log("\n📝 Next Steps:");
  console.log("1. Save the contract address for your backend/database");
  console.log("2. Update your backend to use this contract address");
  console.log("3. Set up IPFS pinning service for metadata storage");
  console.log("4. Test issueCertificate function with test data");
  console.log("\n💡 Example: Issue a certificate");
  console.log(`   await certificate.issueCertificate(`);
  console.log(`     "0x...", // Student wallet address`);
  console.log(`     "course-id-123", // Course ID`);
  console.log(`     "ipfs://Qm...", // IPFS metadata URI`);
  console.log(`   );\n`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

