// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title CertificateNFT
 * @dev ERC721 NFT contract for minting educational certificates on SkillChain
 */
contract CertificateNFT is ERC721, Ownable {
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIdCounter;
    
    struct Certificate {
        string learnerName;
        string courseTitle;
        uint256 completionDate;
        string metadataURI;
    }
    
    mapping(uint256 => Certificate) public certificates;
    
    // Only authorized minters (SkillChain backend)
    mapping(address => bool) public authorizedMinters;
    
    event CertificateMinted(
        uint256 indexed tokenId,
        address indexed learner,
        string courseTitle,
        uint256 completionDate
    );
    
    constructor(address initialOwner) ERC721("SkillChain Certificate", "SKC") Ownable(initialOwner) {
        authorizedMinters[msg.sender] = true;
    }
    
    /**
     * @dev Add or remove authorized minter
     */
    function setAuthorizedMinter(address minter, bool authorized) external onlyOwner {
        authorizedMinters[minter] = authorized;
    }
    
    /**
     * @dev Mint a certificate NFT
     * @param learner Address of the learner receiving the certificate
     * @param learnerName Name of the learner
     * @param courseTitle Title of the completed course
     * @param metadataURI IPFS or other metadata URI
     */
    function mintCertificate(
        address learner,
        string memory learnerName,
        string memory courseTitle,
        string memory metadataURI
    ) external returns (uint256) {
        require(authorizedMinters[msg.sender], "Not authorized to mint");
        require(learner != address(0), "Invalid learner address");
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(learner, tokenId);
        
        certificates[tokenId] = Certificate({
            learnerName: learnerName,
            courseTitle: courseTitle,
            completionDate: block.timestamp,
            metadataURI: metadataURI
        });
        
        emit CertificateMinted(tokenId, learner, courseTitle, block.timestamp);
        
        return tokenId;
    }
    
    /**
     * @dev Get certificate details
     */
    function getCertificate(uint256 tokenId) external view returns (Certificate memory) {
        require(_ownerOf(tokenId) != address(0), "Certificate does not exist");
        return certificates[tokenId];
    }
    
    /**
     * @dev Override to prevent transfers (certificates are non-transferable)
     */
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        require(to == address(0) || to == ownerOf(tokenId), "Certificates are non-transferable");
        return super._update(to, tokenId, auth);
    }
}

