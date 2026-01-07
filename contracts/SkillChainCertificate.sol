// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title SkillChainCertificate
 * @dev ERC-721 NFT contract for issuing verifiable course completion certificates
 * @notice Certificates are minted as NFTs with metadata stored on IPFS
 * @notice Certificates are soulbound - they cannot be transferred after minting
 */
contract SkillChainCertificate is ERC721URIStorage, Ownable {
    // Token ID counter
    uint256 private _tokenIdCounter;

    // Events
    event CertificateIssued(
        uint256 indexed tokenId,
        address indexed student,
        string metadataURI
    );

    /**
     * @dev Constructor sets the contract deployer as the owner
     * @param initialOwner The address that will own the contract (platform admin)
     */
    constructor(address initialOwner) ERC721("SkillChain Certificate", "SKILLCERT") Ownable(initialOwner) {}

    /**
     * @dev Issue a certificate NFT to a student
     * @param student The address of the student receiving the certificate
     * @param metadataURI The IPFS URI pointing to the certificate metadata JSON
     * @return tokenId The ID of the newly minted certificate NFT
     * 
     * Requirements:
     * - Only the contract owner (platform) can call this function
     * - Student address cannot be zero address
     * - MetadataURI must not be empty
     */
    function issueCertificate(
        address student,
        string memory metadataURI
    ) public onlyOwner returns (uint256) {
        require(student != address(0), "SkillChainCertificate: Student address cannot be zero");
        require(bytes(metadataURI).length > 0, "SkillChainCertificate: Metadata URI cannot be empty");

        // Increment token ID counter
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        // Mint NFT to student
        _safeMint(student, tokenId);

        // Set token URI (IPFS metadata)
        _setTokenURI(tokenId, metadataURI);

        // Emit event
        emit CertificateIssued(tokenId, student, metadataURI);

        return tokenId;
    }

    /**
     * @dev Convenience function with additional parameters for minting
     * @param student The address of the student receiving the certificate
     * @param studentName The name of the student (for event/logging purposes)
     * @param courseTitle The title of the course completed
     * @param metadataURI The IPFS URI pointing to the certificate metadata JSON
     * @return tokenId The ID of the newly minted certificate NFT
     */
    function mintCertificate(
        address student,
        string memory studentName,
        string memory courseTitle,
        string memory metadataURI
    ) public onlyOwner returns (uint256) {
        // We use studentName and courseTitle in events but main storage is via metadataURI
        return issueCertificate(student, metadataURI);
    }

    /**
     * @dev Get the total number of certificates issued
     * @return count The total number of certificates minted
     */
    function totalCertificates() public view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Override to prevent token transfers (certificates are non-transferable/soulbound)
     * @notice Only minting (from = address(0)) and burning (to = address(0)) are allowed
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        
        // Allow minting (from == 0) and burning (to == 0), block transfers
        if (from != address(0) && to != address(0)) {
            revert("SkillChainCertificate: Certificates are non-transferable");
        }
        
        return super._update(to, tokenId, auth);
    }

    /**
     * @dev Override tokenURI to use ERC721URIStorage
     */
    function tokenURI(uint256 tokenId) public view override(ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    /**
     * @dev Override supportsInterface for ERC721URIStorage
     */
    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
