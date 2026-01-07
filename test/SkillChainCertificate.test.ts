import { expect } from "chai";
import { ethers } from "hardhat";
import { SkillChainCertificate } from "../typechain-types";

describe("SkillChainCertificate", function () {
  let certificate: SkillChainCertificate;
  let owner: any;
  let student: any;
  let otherAccount: any;

  const courseId = "course-123";
  const metadataURI = "ipfs://QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx";

  beforeEach(async function () {
    [owner, student, otherAccount] = await ethers.getSigners();

    const CertificateContract = await ethers.getContractFactory("SkillChainCertificate");
    certificate = await CertificateContract.deploy(owner.address);
    await certificate.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await certificate.owner()).to.equal(owner.address);
    });

    it("Should have correct name and symbol", async function () {
      expect(await certificate.name()).to.equal("SkillChain Certificate");
      expect(await certificate.symbol()).to.equal("SKILLCERT");
    });

    it("Should start with zero certificates", async function () {
      expect(await certificate.totalCertificates()).to.equal(0);
    });
  });

  describe("Certificate Issuance", function () {
    it("Should issue a certificate to a student", async function () {
      const tx = await certificate.issueCertificate(student.address, courseId, metadataURI);
      await tx.wait();

      const tokenId = await certificate.getCertificateTokenId(student.address, courseId);
      expect(tokenId).to.be.gt(0);
      expect(await certificate.ownerOf(tokenId)).to.equal(student.address);
      expect(await certificate.tokenURI(tokenId)).to.equal(metadataURI);
    });

    it("Should increment total certificates", async function () {
      await certificate.issueCertificate(student.address, courseId, metadataURI);
      expect(await certificate.totalCertificates()).to.equal(1);

      await certificate.issueCertificate(otherAccount.address, "course-456", metadataURI);
      expect(await certificate.totalCertificates()).to.equal(2);
    });

    it("Should prevent duplicate certificate issuance", async function () {
      await certificate.issueCertificate(student.address, courseId, metadataURI);

      await expect(
        certificate.issueCertificate(student.address, courseId, metadataURI)
      ).to.be.revertedWith("SkillChainCertificate: Certificate already issued for this course");
    });

    it("Should only allow owner to issue certificates", async function () {
      await expect(
        certificate.connect(student).issueCertificate(student.address, courseId, metadataURI)
      ).to.be.revertedWithCustomError(certificate, "OwnableUnauthorizedAccount");
    });

    it("Should reject zero address", async function () {
      await expect(
        certificate.issueCertificate(ethers.ZeroAddress, courseId, metadataURI)
      ).to.be.revertedWith("SkillChainCertificate: Student address cannot be zero");
    });

    it("Should reject empty metadata URI", async function () {
      await expect(
        certificate.issueCertificate(student.address, courseId, "")
      ).to.be.revertedWith("SkillChainCertificate: Metadata URI cannot be empty");
    });

    it("Should reject empty course ID", async function () {
      await expect(
        certificate.issueCertificate(student.address, "", metadataURI)
      ).to.be.revertedWith("SkillChainCertificate: Course ID cannot be empty");
    });

    it("Should emit CertificateIssued event", async function () {
      await expect(certificate.issueCertificate(student.address, courseId, metadataURI))
        .to.emit(certificate, "CertificateIssued")
        .withArgs(1, student.address, courseId, metadataURI);
    });
  });

  describe("Batch Issuance", function () {
    it("Should issue multiple certificates in batch", async function () {
      const students = [student.address, otherAccount.address];
      const courseIds = ["course-1", "course-2"];
      const metadataURIs = [metadataURI, metadataURI];

      const tx = await certificate.batchIssueCertificates(students, courseIds, metadataURIs);
      await tx.wait();

      expect(await certificate.totalCertificates()).to.equal(2);
      expect(await certificate.hasCertificate(student.address, "course-1")).to.be.true;
      expect(await certificate.hasCertificate(otherAccount.address, "course-2")).to.be.true;
    });

    it("Should reject batch with mismatched array lengths", async function () {
      await expect(
        certificate.batchIssueCertificates(
          [student.address],
          ["course-1", "course-2"],
          [metadataURI]
        )
      ).to.be.revertedWith("SkillChainCertificate: Array lengths must match");
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await certificate.issueCertificate(student.address, courseId, metadataURI);
    });

    it("Should return correct token ID", async function () {
      const tokenId = await certificate.getCertificateTokenId(student.address, courseId);
      expect(tokenId).to.equal(1);
    });

    it("Should return correct course ID", async function () {
      const tokenId = await certificate.getCertificateTokenId(student.address, courseId);
      expect(await certificate.getCourseId(tokenId)).to.equal(courseId);
    });

    it("Should return true for hasCertificate", async function () {
      expect(await certificate.hasCertificate(student.address, courseId)).to.be.true;
    });

    it("Should return false for non-existent certificate", async function () {
      expect(await certificate.hasCertificate(student.address, "non-existent")).to.be.false;
    });
  });

  describe("Non-Transferability (Soulbound)", function () {
    let tokenId: bigint;

    beforeEach(async function () {
      const tx = await certificate.issueCertificate(student.address, courseId, metadataURI);
      await tx.wait();
      tokenId = await certificate.getCertificateTokenId(student.address, courseId);
    });

    it("Should prevent transfers", async function () {
      await expect(
        certificate.connect(student).transferFrom(student.address, otherAccount.address, tokenId)
      ).to.be.revertedWith("SkillChainCertificate: Certificates are non-transferable");
    });

    it("Should prevent approvals", async function () {
      await expect(
        certificate.connect(student).approve(otherAccount.address, tokenId)
      ).to.be.revertedWith("SkillChainCertificate: Certificates are non-transferable");
    });

    it("Should prevent setApprovalForAll", async function () {
      await expect(
        certificate.connect(student).setApprovalForAll(otherAccount.address, true)
      ).to.be.revertedWith("SkillChainCertificate: Certificates are non-transferable");
    });
  });
});

